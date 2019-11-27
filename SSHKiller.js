const AWS = require('aws-sdk')
var ec2 = new AWS.EC2();
var sts = new AWS.STS();

var sts_params = {
    RoleArn: "arn:aws:iam::941828255123:role/prisma-test-role",
    RoleSessionName: "PrismaTest"
}

var resp = {};

exports.handler = (event, context, callback) => {
    
    sts.assumeRole(sts_params, function(err, data) {
        if(err) {
            console.log(err, err.stack)
            resp = response('Internal server error!', 501)
            callback(null, resp)
        } else {
            let params = {
                Filters: [
                    {
                        Name: "ip-permission.from-port",
                        Values: [
                            "22"
                            ]
                    },
                    {
                        Name: "ip-permission.cidr",
                        Values: [
                            "0.0.0.0/0",
                            ]
                    },
                    {
                        Name: "ip-permission.ipv6-cidr",
                        Values: [
                            "::/0"
                            ]
                    },
                    {
                        Name: "ip-permission.to-port",
                        Values: [
                            "22"
                            ]
                    }
                    ]
            }

            ec2.config.credentials = new AWS.TemporaryCredentials({RoleArn: sts_params.RoleArn});
            
                ec2.describeSecurityGroups( params, function(err, data) {
                     if(err) {
                        console.log(err, err.stack)
                        resp = response('Internal server error!', 501)
                        callback(null, resp)
                        } else {
                        console.log("total security group:", data.SecurityGroups.length)
                        console.log(data.SecurityGroups)
                        for(let i = 0; i < data.SecurityGroups.length ; i++){
                            data.SecurityGroups[i].IpPermissions.forEach(element => {
                                if(element.FromPort === 22) {
                                    element.IpRanges.forEach(ipelement => {
                                        if(ipelement.CidrIp === '0.0.0.0/0'){
                                            let revokeParams = {
                                            GroupId: data.SecurityGroups[i].GroupId,
                                            IpPermissions: [
                                                {
                                                    FromPort: 22,
                                                    IpProtocol: "TCP",
                                                    IpRanges: [
                                                        {
                                                            CidrIp: "0.0.0.0/0"
                                                        }
                                                        ],
                                                    Ipv6Ranges: [
                                                        {
                                                            CidrIpv6: "::/0"
                                                        }
                                                        ],
                                                    ToPort: 22
                                                }
                                                ]
                                        }
                                        ec2.revokeSecurityGroupIngress(revokeParams, function(err, data) {
                                            if(err) {
                                                console.log(err, err.stack);
                                                resp = response('Internal server error!', 501)
                                                callback(null, resp)
                                            } else {
                                                console.log('IpPermissions revoke:', revokeParams.GroupId)

                                            }
                                        })
                                        } else {
                                            console.log("SSH only open to ", ipelement.CidrIp)
                                        }
                                    })
                                }
                            })
                        }
                        }
                        resp = response('Successfully remove SSH inbound rule from security groups', 200);
                        callback(null, resp);
        });
        }
    })
};


var response = (message, status) => {
    console.log("Message: " + message);
    return {
        statusCode: status,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: message
        }),
      };
  };
