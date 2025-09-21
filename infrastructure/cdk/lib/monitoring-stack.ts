import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  ecsCluster: ecs.Cluster;
  ecsService: ecs.FargateService;
  loadBalancer: elbv2.ApplicationLoadBalancer;
  database: rds.DatabaseInstance;
  redisCluster: elasticache.CfnCacheCluster;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, ecsCluster, ecsService, loadBalancer, database, redisCluster } = props;

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `taskflow-pro-alerts-${environment}`,
      displayName: `TaskFlow Pro Alerts - ${environment}`,
    });

    // Email subscription (replace with your email)
    const emailSubscription = new sns.Subscription(this, 'EmailSubscription', {
      topic: alertTopic,
      protocol: sns.SubscriptionProtocol.EMAIL,
      endpoint: 'admin@taskflowpro.com', // Replace with your email
    });

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `TaskFlowPro-${environment}`,
    });

    // ECS Metrics
    const ecsCpuUtilization = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        ServiceName: ecsService.serviceName,
        ClusterName: ecsCluster.clusterName,
      },
      statistic: 'Average',
    });

    const ecsMemoryUtilization = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'MemoryUtilization',
      dimensionsMap: {
        ServiceName: ecsService.serviceName,
        ClusterName: ecsCluster.clusterName,
      },
      statistic: 'Average',
    });

    // ALB Metrics
    const albRequestCount = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCount',
      dimensionsMap: {
        LoadBalancer: loadBalancer.loadBalancerFullName,
      },
      statistic: 'Sum',
    });

    const albResponseTime = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'TargetResponseTime',
      dimensionsMap: {
        LoadBalancer: loadBalancer.loadBalancerFullName,
      },
      statistic: 'Average',
    });

    const albHttpErrorRate = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'HTTPCode_Target_5XX_Count',
      dimensionsMap: {
        LoadBalancer: loadBalancer.loadBalancerFullName,
      },
      statistic: 'Sum',
    });

    // RDS Metrics
    const rdsCpuUtilization = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        DBInstanceIdentifier: database.instanceIdentifier,
      },
      statistic: 'Average',
    });

    const rdsConnections = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'DatabaseConnections',
      dimensionsMap: {
        DBInstanceIdentifier: database.instanceIdentifier,
      },
      statistic: 'Average',
    });

    const rdsFreeableMemory = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'FreeableMemory',
      dimensionsMap: {
        DBInstanceIdentifier: database.instanceIdentifier,
      },
      statistic: 'Average',
    });

    // ElastiCache Metrics
    const redisCpuUtilization = new cloudwatch.Metric({
      namespace: 'AWS/ElastiCache',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        CacheClusterId: redisCluster.ref,
      },
      statistic: 'Average',
    });

    const redisCurrConnections = new cloudwatch.Metric({
      namespace: 'AWS/ElastiCache',
      metricName: 'CurrConnections',
      dimensionsMap: {
        CacheClusterId: redisCluster.ref,
      },
      statistic: 'Average',
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS CPU Utilization',
        left: [ecsCpuUtilization],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS Memory Utilization',
        left: [ecsMemoryUtilization],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ALB Request Count',
        left: [albRequestCount],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'ALB Response Time',
        left: [albResponseTime],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'ALB 5XX Error Rate',
        left: [albHttpErrorRate],
        width: 8,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'RDS CPU Utilization',
        left: [rdsCpuUtilization],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'RDS Connections',
        left: [rdsConnections],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'RDS Freeable Memory',
        left: [rdsFreeableMemory],
        width: 8,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Redis CPU Utilization',
        left: [redisCpuUtilization],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Redis Current Connections',
        left: [redisCurrConnections],
        width: 12,
      })
    );

    // CloudWatch Alarms
    // ECS CPU Alarm
    const ecsCpuAlarm = new cloudwatch.Alarm(this, 'ECSCPUAlarm', {
      metric: ecsCpuUtilization,
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'ECS CPU utilization is high',
      alarmName: `taskflow-pro-ecs-cpu-${environment}`,
    });

    ecsCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // ECS Memory Alarm
    const ecsMemoryAlarm = new cloudwatch.Alarm(this, 'ECSMemoryAlarm', {
      metric: ecsMemoryUtilization,
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'ECS Memory utilization is high',
      alarmName: `taskflow-pro-ecs-memory-${environment}`,
    });

    ecsMemoryAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // ALB Response Time Alarm
    const albResponseTimeAlarm = new cloudwatch.Alarm(this, 'ALBResponseTimeAlarm', {
      metric: albResponseTime,
      threshold: 2, // 2 seconds
      evaluationPeriods: 2,
      alarmDescription: 'ALB response time is high',
      alarmName: `taskflow-pro-alb-response-time-${environment}`,
    });

    albResponseTimeAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // ALB Error Rate Alarm
    const albErrorRateAlarm = new cloudwatch.Alarm(this, 'ALBErrorRateAlarm', {
      metric: albHttpErrorRate,
      threshold: 10, // 10 errors in 5 minutes
      evaluationPeriods: 1,
      alarmDescription: 'ALB error rate is high',
      alarmName: `taskflow-pro-alb-error-rate-${environment}`,
    });

    albErrorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // RDS CPU Alarm
    const rdsCpuAlarm = new cloudwatch.Alarm(this, 'RDSCPUAlarm', {
      metric: rdsCpuUtilization,
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'RDS CPU utilization is high',
      alarmName: `taskflow-pro-rds-cpu-${environment}`,
    });

    rdsCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // RDS Connections Alarm
    const rdsConnectionsAlarm = new cloudwatch.Alarm(this, 'RDSConnectionsAlarm', {
      metric: rdsConnections,
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'RDS connection count is high',
      alarmName: `taskflow-pro-rds-connections-${environment}`,
    });

    rdsConnectionsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // Redis CPU Alarm
    const redisCpuAlarm = new cloudwatch.Alarm(this, 'RedisCPUAlarm', {
      metric: redisCpuUtilization,
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Redis CPU utilization is high',
      alarmName: `taskflow-pro-redis-cpu-${environment}`,
    });

    redisCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // Custom Application Metrics
    const customMetrics = [
      'ActiveUsers',
      'TaskCreationRate',
      'ProjectCreationRate',
      'APIResponseTime',
      'DatabaseQueryTime',
      'CacheHitRate',
    ];

    customMetrics.forEach(metricName => {
      const metric = new cloudwatch.Metric({
        namespace: 'TaskFlowPro/Application',
        metricName,
        statistic: 'Average',
      });

      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: metricName,
          left: [metric],
          width: 6,
        })
      );
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=TaskFlowPro-${environment}`,
      description: 'CloudWatch Dashboard URL',
      exportName: `TaskFlowPro-Dashboard-URL-${environment}`,
    });

    new cdk.CfnOutput(this, 'AlertTopicARN', {
      value: alertTopic.topicArn,
      description: 'SNS Topic ARN for alerts',
      exportName: `TaskFlowPro-Alert-Topic-${environment}`,
    });
  }
}
