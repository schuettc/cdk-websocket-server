# CDK Websocket Server

In this demo, we see how to build a simple WebSocket server using Amazon Elastic Container Service with Fargate. This demo also includes an [Amazon CloudFront Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.html), [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/), and [Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-groups.html). This will allow the server to scale up as needed while using TLS to secure the communication.

![Overview](images/Overview.png)

## Cloudfront Distribution

```typescript
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
```

To use TLS for our WebSocket connection, we will build a CloudFront Distribution that only accepts HTTPS.  This will create a certificate that is used by the Distribution.  Behind the Distribution, 