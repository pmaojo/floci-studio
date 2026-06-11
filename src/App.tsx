/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AwsProvider } from './contexts/AwsContext';
import Sidebar from './components/Sidebar';

// Lazy load all views to implement dynamic imports, resolve chunk warnings, and optimize bundling
const Dashboard = lazy(() => import('./views/Dashboard'));
const SQSView = lazy(() => import('./views/SQSView'));
const SNSView = lazy(() => import('./views/SNSView'));
const IAMView = lazy(() => import('./views/IAMView'));
const SecretsManagerView = lazy(() => import('./views/SecretsManagerView'));
const LambdaView = lazy(() => import('./views/LambdaView'));
const LiveEventsView = lazy(() => import('./views/LiveEventsView'));
const KMSView = lazy(() => import('./views/KMSView'));
const ACMView = lazy(() => import('./views/ACMView'));
const ECSView = lazy(() => import('./views/ECSView'));
const CloudWatchLogsView = lazy(() => import('./views/CloudWatchLogsView'));
const EventBridgeView = lazy(() => import('./views/EventBridgeView'));
const RDSView = lazy(() => import('./views/RDSView'));
const VPCView = lazy(() => import('./views/VPCView'));
const KinesisView = lazy(() => import('./views/KinesisView'));
const CloudFormationView = lazy(() => import('./views/CloudFormationView'));
const ECRView = lazy(() => import('./views/ECRView'));
const ElastiCacheView = lazy(() => import('./views/ElastiCacheView'));
const GlueView = lazy(() => import('./views/GlueView'));
const APIGatewayView = lazy(() => import('./views/APIGatewayView'));
const WAFView = lazy(() => import('./views/WAFView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

const ArchitectureView = lazy(() => import('./views/studio/ArchitectureView'));
const LambdaLogsView = lazy(() => import('./views/studio/LambdaLogsView'));
const JwtMocksView = lazy(() => import('./views/studio/JwtMocksView'));
const ApiClientView = lazy(() => import('./views/studio/ApiClientView'));
const DlqView = lazy(() => import('./views/studio/DlqView'));
const FlightRecorderView = lazy(() => import('./views/studio/FlightRecorderView'));
const ServiceGraphView = lazy(() => import('./views/studio/ServiceGraphView'));
const DriftView = lazy(() => import('./views/studio/DriftView'));
const HybridView = lazy(() => import('./views/studio/HybridView'));
const ExtensibilityView = lazy(() => import('./views/studio/ExtensibilityView'));
const PipelineView = lazy(() => import('./views/studio/PipelineView'));

const EksView = lazy(() => import('./views/EksView'));
const AwsCliServiceView = lazy(() => import('./views/AwsCliServiceView'));
const CostExplorerView = lazy(() => import('./views/CostExplorerView'));
const PerformanceMonitorView = lazy(() => import('./views/PerformanceMonitorView'));
const S3View = lazy(() => import('./views/S3View'));
const MarketplaceView = lazy(() => import('./views/MarketplaceView'));
const AthenaView = lazy(() => import('./views/AthenaView'));
const DynamoDBView = lazy(() => import('./views/DynamoDBView'));
const CodeBuildView = lazy(() => import('./views/CodeBuildView'));
const SchedulerView = lazy(() => import('./views/SchedulerView'));
const StepFunctionsView = lazy(() => import('./views/StepFunctionsView'));
const SSMView = lazy(() => import('./views/SSMView'));
const CloudWatchMetricsView = lazy(() => import('./views/CloudWatchMetricsView'));
const SESView = lazy(() => import('./views/SESView'));
import { useAws } from './contexts/AwsContext';
import { format } from 'date-fns';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from './lib/utils';
import { REAL_DATA_ONLY, clearSimulatedLocalStorage } from './lib/realDataPolicy';

const awsServiceRoute = (serviceKey: string, serviceName: string) => (
  <AwsCliServiceView serviceKey={serviceKey} serviceName={serviceName} />
);

const RetroLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-brand-bg text-brand-text h-full uppercase p-6 select-none font-mono">
    <div className="border border-brand-text p-6 bg-brand-muted max-w-sm w-full space-y-4 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
      <div className="flex justify-between items-center border-b border-brand-text pb-2">
        <span className="text-[9px] font-bold tracking-widest text-neutral-500">BUS_IO_TRANSCEIVER</span>
        <span className="w-2 h-2 bg-brand-text rounded-xs animate-ping" />
      </div>
      <div className="space-y-1 text-[9px] font-bold text-neutral-600">
        <p className="flex justify-between"><span>LINKING_DYN_SEGMENT</span><span className="text-brand-text">OK</span></p>
        <p className="flex justify-between"><span>SWAPPING_THREAD_IO</span><span className="text-brand-text animate-pulse">PENDING...</span></p>
      </div>
      <div className="w-full bg-brand-bg h-3 border border-brand-text overflow-hidden p-0.5 shrink-0">
        <div className="bg-brand-text h-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  </div>
);

const AppContent = () => {
  const { activity } = useAws();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = React.useState(true);

  React.useEffect(() => {
    if (REAL_DATA_ONLY) {
      clearSimulatedLocalStorage();
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-brand-bg text-brand-text overflow-hidden font-sans border border-brand-text">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-brand-text flex items-center justify-between px-4 lg:px-6 bg-brand-muted shrink-0">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 lg:hidden border border-brand-text hover:bg-brand-bg"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-text rounded-sm flex items-center justify-center text-white font-bold">F</div>
            <span className="text-base lg:text-lg font-bold tracking-tighter uppercase italic">Floci.io</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 text-[10px] uppercase font-bold text-neutral-500">
          {REAL_DATA_ONLY && (
            <span className="border border-brand-text px-2 py-1 bg-white text-brand-text">REAL DATA ONLY</span>
          )}
          <span>AWS Local Emulation Console</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="flex-1 overflow-auto bg-white/50">
            <Suspense fallback={<RetroLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/s3" element={<S3View />} />
                <Route path="/dynamodb" element={<DynamoDBView />} />
                <Route path="/sqs" element={<SQSView />} />
                <Route path="/sns" element={<SNSView />} />
                <Route path="/lambda" element={<LambdaView />} />
                <Route path="/autoscaling" element={awsServiceRoute('autoscaling', 'Auto Scaling')} />
                <Route path="/iam" element={<IAMView />} />
                <Route path="/sts" element={awsServiceRoute('sts', 'STS')} />
                <Route path="/secrets" element={<SecretsManagerView />} />
                <Route path="/codeartifact" element={awsServiceRoute('codeartifact', 'CodeArtifact')} />
                <Route path="/ses" element={<SESView />} />
                <Route path="/kms" element={<KMSView />} />
                <Route path="/acm" element={<ACMView />} />
                <Route path="/events" element={<LiveEventsView />} />
                <Route path="/cloudwatch" element={<CloudWatchLogsView />} />
                <Route path="/cloudwatch-metrics" element={<CloudWatchMetricsView />} />
                <Route path="/eventbridge" element={<EventBridgeView />} />
                <Route path="/scheduler" element={<SchedulerView />} />
                <Route path="/apigateway" element={<APIGatewayView />} />
                <Route path="/rds" element={<RDSView />} />
                <Route path="/vpc" element={<VPCView />} />
                <Route path="/route53" element={awsServiceRoute('route53', 'Route 53')} />
                <Route path="/stepfunctions" element={<StepFunctionsView />} />
                <Route path="/kinesis" element={<KinesisView />} />
                <Route path="/firehose" element={awsServiceRoute('firehose', 'Data Firehose')} />
                <Route path="/cloudformation" element={<CloudFormationView />} />
                <Route path="/appconfig" element={awsServiceRoute('appconfig', 'AppConfig')} />
                <Route path="/appconfigdata" element={awsServiceRoute('appconfigdata', 'AppConfig Data')} />
                <Route path="/cognito" element={awsServiceRoute('cognito', 'Cognito')} />
                <Route path="/ecr" element={<ECRView />} />
                <Route path="/athena" element={<AthenaView />} />
                <Route path="/cloudfront" element={awsServiceRoute('cloudfront', 'CloudFront')} />
                <Route path="/elasticache" element={<ElastiCacheView />} />
                <Route path="/glue" element={<GlueView />} />
                <Route path="/ssm" element={<SSMView />} />
                <Route path="/waf" element={<WAFView />} />
                <Route path="/codebuild" element={<CodeBuildView />} />
                <Route path="/codepipeline" element={awsServiceRoute('codepipeline', 'CodePipeline')} />
                <Route path="/codedeploy" element={awsServiceRoute('codedeploy', 'CodeDeploy')} />
                <Route path="/appsync" element={awsServiceRoute('appsync', 'AppSync')} />
                <Route path="/marketplace" element={<MarketplaceView />} />
                <Route path="/roadmap" element={awsServiceRoute('roadmap', 'Roadmap')} />
                <Route path="/settings" element={<SettingsView />} />

              <Route path="/studio/architecture" element={<ArchitectureView />} />
              <Route path="/studio/logs" element={<LambdaLogsView />} />
              <Route path="/studio/jwt" element={<JwtMocksView />} />
              <Route path="/studio/api-client" element={<ApiClientView />} />
              <Route path="/studio/service-graph" element={<ServiceGraphView />} />
              <Route path="/studio/dlq" element={<DlqView />} />
              <Route path="/studio/flight-recorder" element={<FlightRecorderView />} />
              <Route path="/studio/drift" element={<DriftView />} />
              <Route path="/studio/hybrid" element={<HybridView />} />
              <Route path="/studio/extensibility" element={<ExtensibilityView />} />
              <Route path="/studio/pipeline" element={<PipelineView />} />

                <Route path="/ecs" element={<ECSView />} />
                <Route path="/ec2" element={awsServiceRoute('ec2', 'EC2 Inventory')} />
                <Route path="/redshift" element={awsServiceRoute('redshift', 'Redshift')} />
                <Route path="/opensearch" element={awsServiceRoute('opensearch', 'OpenSearch')} />
                <Route path="/msk" element={awsServiceRoute('msk', 'MSK')} />
                <Route path="/sagemaker" element={awsServiceRoute('sagemaker', 'SageMaker')} />
                <Route path="/bedrock-runtime" element={awsServiceRoute('bedrockruntime', 'Bedrock Runtime')} />
                <Route path="/textract" element={awsServiceRoute('textract', 'Textract')} />
                <Route path="/iotcore" element={awsServiceRoute('iotcore', 'IoT Core')} />
                <Route path="/batch" element={awsServiceRoute('batch', 'AWS Batch')} />
                <Route path="/transitgateway" element={awsServiceRoute('transitgateway', 'Transit Gateway')} />
                <Route path="/beanstalk" element={awsServiceRoute('beanstalk', 'Elastic Beanstalk')} />
                <Route path="/efs" element={awsServiceRoute('efs', 'EFS')} />
                <Route path="/neptune" element={awsServiceRoute('neptune', 'Neptune')} />
                <Route path="/cloudtrail" element={awsServiceRoute('cloudtrail', 'CloudTrail')} />
                <Route path="/identitycenter" element={awsServiceRoute('identitycenter', 'IAM Identity Center')} />
                <Route path="/elb" element={awsServiceRoute('elb', 'Elastic Load Balancing')} />
                <Route path="/eks" element={<EksView />} />
                <Route path="/apprunner" element={awsServiceRoute('apprunner', 'App Runner')} />
                <Route path="/backup" element={awsServiceRoute('backup', 'Backup')} />
                <Route path="/transfer" element={awsServiceRoute('transfer', 'Transfer Family')} />
                <Route path="/pricing" element={awsServiceRoute('pricing', 'Pricing')} />
                <Route path="/costexplorer" element={<CostExplorerView />} />
                <Route path="/performance" element={<PerformanceMonitorView />} />
                <Route path="/cur" element={awsServiceRoute('cur', 'Cost and Usage Reports')} />
                <Route path="/bcmdataexports" element={awsServiceRoute('bcmdataexports', 'BCM Data Exports')} />
                <Route path="/awsq" element={awsServiceRoute('awsq', 'AWS Q Developer')} />
              </Routes>
            </Suspense>
          </div>

          {/* Activity Console */}
          <div className={cn(
            "border-t border-brand-text bg-brand-console text-brand-green font-mono text-[10px] flex flex-col shrink-0 transition-all duration-300",
            isConsoleExpanded ? "h-40" : "h-10"
          )}>
            <div 
              className="flex items-center justify-between px-4 h-10 border-b border-brand-green/20 cursor-pointer hover:bg-white/5"
              onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            >
              <div className="flex items-center gap-4">
                <span className="uppercase font-bold tracking-widest text-[9px]">Event Stream</span>
                <div className="hidden sm:flex space-x-4 opacity-70">
                  <span>AUTO_FLUSH: ON</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isConsoleExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
            </div>
            
            {isConsoleExpanded && (
              <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-hide p-4 pt-1">
                {activity.length === 0 ? (
                  <div className="opacity-20 italic">WAITING_FOR_TRAFFIC...</div>
                ) : (
                  activity.slice(0, 50).map(log => (
                    <div key={log.id} className="opacity-80 flex gap-2 flex-wrap sm:flex-nowrap">
                      <span className="opacity-40">[{format(log.timestamp, 'HH:mm:ss.SS')}]</span>
                      <span className={log.status === 'success' ? 'text-white italic' : 'text-rose-500 italic'}>
                        {log.service}.{log.action}
                      </span>
                      {log.details && <span className="opacity-60 truncate max-w-full"> {log.details}</span>}
                      <span className="ml-auto opacity-40 shrink-0">
                        {log.status === 'success' ? '200' : '500'}
                      </span>
                    </div>
                  ))
                )}
                <div className="animate-pulse">_</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AwsProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AwsProvider>
  );
}
