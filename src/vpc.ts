import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class VPCResources extends Construct {
  public vpc: Vpc;
  public applicationLoadBalancer: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ServerPublic',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
      ],
      maxAzs: 2,
    });

    this.applicationLoadBalancer = new ApplicationLoadBalancer(
      this,
      'ApplicationLoadBalancer',
      {
        vpc: this.vpc,
        internetFacing: true,
      },
    );
  }
}
