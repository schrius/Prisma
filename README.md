# Prisma
AWS Lambda Function for cleanup VPC Resouce in Non Virginia Region. 
Required integration with Prisma Cloud, with Policy Query:
## config where cloud.type = 'aws' AND cloud.region != 'AWS Virginia' AND api.name = 'aws-ec2-describe-vpcs' AND json.rule = state equals "available"
Alert Use AWS SQS to triger cleanup.