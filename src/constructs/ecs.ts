import { Duration } from 'aws-cdk-lib';
import {
  SubnetType,
  Vpc,
  Port,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  ContainerImage,
  ContainerInsights,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  OperatingSystemFamily,
} from 'aws-cdk-lib/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationTargetGroup,
  ApplicationProtocol,
  Protocol,
  ListenerAction,
  ListenerCondition,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ServicePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ECSResourcesProps {
  vpc: Vpc;
  applicationLoadBalancer: ApplicationLoadBalancer;
  randomString: string;
  customHeader: string;
}

export class ECSResources extends Construct {
  public cluster: Cluster;

  constructor(scope: Construct, id: string, props: ECSResourcesProps) {
    super(scope, id);

    this.cluster = new Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'websocket-service',
      containerInsightsV2: ContainerInsights.ENHANCED,
    });


    const websocketServiceRole = new Role(this, 'WebSocketServiceRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const webSocketTask = new FargateTaskDefinition(
      this,
      'WebSocketTaskDefinition',
      {
        memoryLimitMiB: 2048,
        cpu: 1024,
        runtimePlatform: {
          operatingSystemFamily: OperatingSystemFamily.LINUX,
          cpuArchitecture: CpuArchitecture.ARM64,
        },
        taskRole: websocketServiceRole,
      },
    );

    webSocketTask.addContainer('WebSocketContainer', {
      image: ContainerImage.fromAsset('src/constructs/resources/containerImage'),
      containerName: 'websocket-service',
      portMappings: [{ containerPort: 8080, hostPort: 8080 }],
      logging: LogDrivers.awsLogs({
        streamPrefix: 'websocket-service',
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8080/health'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(30),
      },
      environment: {},
    });

    const websocketService = new FargateService(this, 'WebSocketService', {
      cluster: this.cluster,
      taskDefinition: webSocketTask,
      assignPublicIp: true,
      desiredCount: 1,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      enableExecuteCommand: true,
    });

    websocketService.connections.allowFrom(
      props.applicationLoadBalancer,
      Port.tcp(8080),
      'Allow traffic from ALB on port 8080',
    );

    const webSocketTargetGroup = new ApplicationTargetGroup(
      this,
      'webSocketTargetGroup',
      {
        vpc: props.vpc,
        port: 8080,
        protocol: ApplicationProtocol.HTTP,
        targets: [websocketService],
        healthCheck: {
          path: '/',
          protocol: Protocol.HTTP,
          port: '8080',
        },
      },
    );

    const webSocketListener = props.applicationLoadBalancer.addListener(
      'webSocketListener',
      {
        port: 80,
        protocol: ApplicationProtocol.HTTP,
        open: true,
        defaultAction: ListenerAction.fixedResponse(403),
      },
    );

    webSocketListener.addAction('ForwardFromCloudFront', {
      conditions: [
        ListenerCondition.httpHeader(props.customHeader, [props.randomString]),
      ],
      action: ListenerAction.forward([webSocketTargetGroup]),
      priority: 1,
    });

    const scalableTarget = websocketService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 5,
    });

    scalableTarget.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 5,
      targetGroup: webSocketTargetGroup,
    });
  }
}
