# This Lambda function design to Clean up all Non-AWS-Virginia VPC Resource

import json
import boto3
import time

# Handler is Triggered By SQS
def lambda_handler(event, context):
    sts = boto3.client('sts')

    for record in event["Records"]:
        body = json.loads(record["body"])
        vpcid = body["resource"]["data"]["vpcId"]
        print(vpcid)

        vpcid_filter = [
                {
                    'Name': 'vpc-id',
                    'Values': [
                        vpcid
                        ]
                }
                ]

        if body['resourceRegionId'] == 'us-east-1':
            print('Virgina Region - No action.')
            break

        assumed_role = sts.assume_role(
            RoleArn=f"arn:aws:iam::{body['resource']['accountId']}:role/Prisma_VPC_Term_Role",
            RoleSessionName="PrismaSession"
        )
        credentials=assumed_role['Credentials']

        ec2=boto3.client('ec2',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken'],
            region_name=body['resourceRegionId']
        )

        ec2_instances = ec2.describe_instances( Filters=vpcid_filter )

        instanceIds = []
        for reservation in ec2_instances['Reservations']:
            for instance in reservation['Instances']:
                instanceIds.append(instance['InstanceId'])
        if len(instanceIds) > 0 :
            print(f'Terminating: {instanceIds}')
            ec2.terminate_instances(
                InstanceIds = instanceIds
            )
        
        # Wait for instances to terminate
        time.sleep(2)

        internet_gateways = ec2.describe_internet_gateways(
            Filters=[
                {
                    'Name': 'attachment.vpc-id',
                    'Values': [
                        vpcid
                    ]
                }
            ]
        )
        for internet_gateway in internet_gateways['InternetGateways']:
            print(f'Intenet gateway {internet_gateway}')
            if len(internet_gateway['Attachments']) > 0:
                print(f'attachments found on {internet_gateway["InternetGatewayId"]}')
                for attachment in internet_gateway['Attachments']:
                    ec2.detach_internet_gateway(
                        InternetGatewayId = internet_gateway['InternetGatewayId'],
                        VpcId = attachment['VpcId']
                    )
                    print(f'Detach internet gateway {internet_gateway["InternetGatewayId"]} from {vpcid}')
                
            ec2.delete_internet_gateway(
                InternetGatewayId = internet_gateway['InternetGatewayId']
            )
            print(f'Delete internet gateway {internet_gateway["InternetGatewayId"]}')
        
        subnets = ec2.describe_subnets( Filters = vpcid_filter )
        print('Deleting subnets')
        for subnet in subnets['Subnets']:
            ec2.delete_subnet(
                SubnetId=subnet['SubnetId']
            )

        security_groups = ec2.describe_security_groups( Filters = vpcid_filter )
        print('Deleting custom security group')
        for security_group in security_groups['SecurityGroups']:
            if security_group['GroupName'] != 'default':
                ec2.delete_security_group(
                    GroupId = security_group['GroupId']
                )

        ec2.delete_vpc(
            VpcId = vpcid
        )
        print(f'Delete VPC {vpcid}')
    
    return {
        'statusCode': 200,
        'body': json.dumps('VPC is removed from the region')
    }
