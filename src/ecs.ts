import { Duration } from 'aws-cdk-lib';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import {
  InstanceType,
  SubnetType,
  Vpc,
  SecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import {
  AsgCapacityProvider,
  Cluster,
  ContainerImage,
  CpuArchitecture,
  EcsOptimizedImage,
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
import { ManagedPolicy, ServicePrincipal, Role } from 'aws-cdk-lib/aws-iam';
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
    });

    const autoScalingGroup = new AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc: props.vpc,
      instanceType: new InstanceType('m6i.large'),
      machineImage: EcsOptimizedImage.amazonLinux2(),
      desiredCapacity: 1,
    });

    autoScalingGroup.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    );

    const capacityProvider = new AsgCapacityProvider(this, 'capacityProvider', {
      autoScalingGroup: autoScalingGroup,
    });

    this.cluster.addAsgCapacityProvider(capacityProvider);

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
      image: ContainerImage.fromAsset('src/resources/containerImage'),
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

    const webSocketServiceSecurityGroup = new SecurityGroup(
      this,
      'webSocketServiceSecurityGroup',
      { vpc: props.vpc, allowAllOutbound: true },
    );

    const websocketService = new FargateService(this, 'WebSocketService', {
      cluster: this.cluster,
      taskDefinition: webSocketTask,
      assignPublicIp: true,
      desiredCount: 0,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      securityGroups: [webSocketServiceSecurityGroup],
      enableExecuteCommand: true,
    });

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
        defaultAction: ListenerAction.fixedResponse(503),
      },
    );

    webSocketListener.addAction('ForwardFromCloudFront', {
      conditions: [
        ListenerCondition.httpHeader(props.customHeader, [props.randomString]),
      ],
      action: ListenerAction.forward([webSocketTargetGroup]),
    });

    // webSocketListener.addTargetGroups('webSocketTargetGroupListener', {
    //   targetGroups: [webSocketTargetGroup],
    // });
  }
}
