/* eslint-disable import/no-extraneous-dependencies */
import { randomBytes } from 'crypto';
import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { ECSResources, VPCResources, DistributionResources } from '../constructs';

export class WebSocketServer extends Stack {
  constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    const randomString = process.env.NODE_ENV === 'test' ? 'testString' : generateRandomString(8);
    const customHeader = 'X-From-CloudFront';

    const vpcResources = new VPCResources(this, 'VPCResources');

    const ecsResources = new ECSResources(this, 'ECSResources', {
      vpc: vpcResources.vpc,
      applicationLoadBalancer: vpcResources.applicationLoadBalancer,
      customHeader: customHeader,
      randomString: randomString,
    });

    const distributionResources = new DistributionResources(
      this,
      'DistributionResources',
      {
        applicationLoadBalancer: vpcResources.applicationLoadBalancer,
        customHeader: customHeader,
        randomString: randomString,
      },
    );

    new CfnOutput(this, 'websocketUrl', {
      value: `wss://${distributionResources.distribution.distributionDomainName}/wss`,
    });

    new CfnOutput(this, 'ClusterArn', {
      value: 'CLUSTER=' + ecsResources.cluster.clusterArn,
    });
    new CfnOutput(this, 'getTask', {
      value:
        'TASK=$( aws ecs list-tasks --cluster $CLUSTER --query taskArns --output text )',
    });

    new CfnOutput(this, 'ecsExecute', {
      value:
        'aws ecs execute-command --cluster $CLUSTER --task $TASK --command "bash" --interactive',
    });

    NagSuppressions.addStackSuppressions(
      this,
      [
        {
          id: 'AwsSolutions-CFR1',
          reason: 'CloudFront WebACL is not required for this demo',
        },
        {
          id: 'AwsSolutions-CFR2',
          reason: 'CloudFront Geo restriction is not required for this demo',
        },
        {
          id: 'AwsSolutions-CFR3',
          reason: 'CloudFront custom certificate is not used in this demo as we utilize the default domain name.',
        },
        {
          id: 'AwsSolutions-CFR4',
          reason: 'CloudFront custom certificate is not used in this demo as we utilize the default domain name.',
        },
        {
          id: 'AwsSolutions-CFR5',
          reason: 'CloudFront uses HTTP only to connect to the origin, therefore origin SSL configurations are not used.',
        },
        {
          id: 'AwsSolutions-VPC7',
          reason: 'VPC Flow Logs are not required for this demo, to keep costs low.',
        },
        {
          id: 'AwsSolutions-ELB2',
          reason: 'Access logging for the ALB is not necessary for this demo.',
        },
        {
          id: 'AwsSolutions-EC23',
          reason: 'ALB needs to be open to CloudFront IPs. We rely on the custom header to secure the ALB instead of IP restrictions.',
        },
        {
          id: 'AwsSolutions-S33',
          reason: 'Server Access Logging on the distribution logging bucket is not critical for this demo.',
        },
        {
          id: 'AwsSolutions-S35',
          reason: 'Enforce SSL is handled.',
        },
        {
          id: 'AwsSolutions-S1',
          reason: 'Server access logs for the logging bucket itself are not strictly necessary for this demo.',
        },
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Managed policies are acceptable for standard task execution roles in this demo.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard permissions are acceptable for default ECS roles in this demo.',
        },
      ],
      true, // Apply to all constructs inside the stack
    );
  }
}

function generateRandomString(length: number): string {
  const randomBytesArray = randomBytes(length);
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytesArray[i] % charset.length;
    result += charset.charAt(randomIndex);
  }

  return result;
}

const app = new App();

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new WebSocketServer(app, 'WebSocketServer', {
  env: devEnv,
});

app.synth();
