/* eslint-disable import/no-extraneous-dependencies */
import { randomBytes } from 'crypto';
import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ECSResources, VPCResources, DistributionResources } from './index';

export class WebSocketServer extends Stack {
  constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    const randomString = generateRandomString(8);
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

    new CfnOutput(this, 'DistributionURL', {
      value: distributionResources.distribution.distributionDomainName,
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
