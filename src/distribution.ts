import { CustomResource, Duration, Stack } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { LoadBalancerV2Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

interface DistributionResourcesProps {
  applicationLoadBalancer: ApplicationLoadBalancer;
  randomString: string;
  customHeader: string;
}
export class DistributionResources extends Construct {
  public distribution: Distribution;

  constructor(scope: Construct, id: string, props: DistributionResourcesProps) {
    super(scope, id);

    const distributionLoggingBucket = new Bucket(
      this,
      'DistributionLoggingBucket',
      {
        publicReadAccess: false,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        encryption: BucketEncryption.S3_MANAGED,
        objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      },
    );

    const defaultOrigin = new LoadBalancerV2Origin(
      props.applicationLoadBalancer,
      { httpPort: 80, protocolPolicy: OriginProtocolPolicy.HTTP_ONLY },
    );

    this.distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: defaultOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      },
      defaultRootObject: 'index.html',
      priceClass: PriceClass.PRICE_CLASS_100,
      logBucket: distributionLoggingBucket,
      enableLogging: true,
    });

    const customHeaderLambdaRole = new Role(this, 'customHeaderLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['cloudFrontPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${
                  this.distribution.distributionId
                }`,
              ],
              actions: ['cloudfront:*'],
            }),
          ],
        }),
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    // const customHeaderCustomResourceRole = new Role(
    //   this,
    //   'customHeaderCustomResourceRole',
    //   {
    //     assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    //     managedPolicies: [
    //       ManagedPolicy.fromAwsManagedPolicyName(
    //         'service-role/AWSLambdaBasicExecutionRole',
    //       ),
    //     ],
    //   },
    // );

    const customHeaderCustomResource = new NodejsFunction(
      this,
      'customHeaderCustomResource',
      {
        handler: 'index.handler',
        entry: 'src/resources/customHeader/index.ts',
        architecture: Architecture.ARM_64,
        timeout: Duration.minutes(1),
        runtime: Runtime.NODEJS_18_X,
        role: customHeaderLambdaRole,
      },
    );

    const customHeaderCustomResourceProvider = new Provider(
      this,
      'customHeaderCustomResourceProvider',
      {
        onEventHandler: customHeaderCustomResource,
        logRetention: RetentionDays.ONE_WEEK,
        // role: customHeaderCustomResourceRole,
      },
    );

    new CustomResource(this, 'customHeaderCustomResource', {
      serviceToken: customHeaderCustomResourceProvider.serviceToken,
      properties: {
        DistributionId: this.distribution.distributionId,
        CustomHeaders: [
          { HeaderName: props.customHeader, HeaderValue: props.randomString },
        ],
      },
    });
  }
}
