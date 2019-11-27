const AWS = require('aws-sdk')
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

            AWS.config.credentials = new AWS.TemporaryCredentials({RoleArn: sts_params.RoleArn});
            event.Records.forEach(record => {
                let params = {
                    VpcId: JSON.parse(record.body).resource.data.vpcId
                }

                let ec2 = new AWS.EC2({region: JSON.parse(record.body).resource.regionId});

                ec2.deleteVpc(params, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        console.log(params.VpcId, " has deleted.");
                        console.log(data);
                    }
                })
            })   
        }
    })

    resp = response('Successfully Delete VPC', 200);
    callback(null, resp);
}


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