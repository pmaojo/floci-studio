/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AwsProvider } from './contexts/AwsContext';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import S3View from './views/S3View';
import DynamoDBView from './views/DynamoDBView';
import SQSView from './views/SQSView';
import SNSView from './views/SNSView';
import IAMView from './views/IAMView';
import SecretsManagerView from './views/SecretsManagerView';
import LambdaView from './views/LambdaView';
import CodeArtifactView from './views/CodeArtifactView';
import SESView from './views/SESView';
import LiveEventsView from './views/LiveEventsView';
import KMSView from './views/KMSView';
import ACMView from './views/ACMView';
import ECSView from './views/ECSView';
import CloudWatchLogsView from './views/CloudWatchLogsView';
import EventBridgeView from './views/EventBridgeView';
import ApiGatewayView from './views/ApiGatewayView';
import RDSView from './views/RDSView';
import VPCView from './views/VPCView';
import Route53View from './views/Route53View';
import StepFunctionsView from './views/StepFunctionsView';
import KinesisView from './views/KinesisView';
import CloudFormationView from './views/CloudFormationView';
import CognitoView from './views/CognitoView';
import ECRView from './views/ECRView';
import AthenaView from './views/AthenaView';
import CloudFrontView from './views/CloudFrontView';
import ElastiCacheView from './views/ElastiCacheView';
import GlueView from './views/GlueView';
import SSMView from './views/SSMView';
import WAFView from './views/WAFView';
import CodeBuildView from './views/CodeBuildView';
import CodePipelineView from './views/CodePipelineView';
import AppSyncView from './views/AppSyncView';
import MarketplaceView from './views/MarketplaceView';
import RoadmapView from './views/RoadmapView';
import SettingsView from './views/SettingsView';
import ServiceNotAvailable from './views/ServiceNotAvailable';
import RedshiftView from './views/RedshiftView';
import OpenSearchView from './views/OpenSearchView';
import MskView from './views/MskView';
import SageMakerView from './views/SageMakerView';
import IotCoreView from './views/IotCoreView';
import BatchView from './views/BatchView';
import TransitGatewayView from './views/TransitGatewayView';
import BeanstalkView from './views/BeanstalkView';
import EfsView from './views/EfsView';
import NeptuneView from './views/NeptuneView';
import CloudTrailView from './views/CloudTrailView';
import IdentityCenterView from './views/IdentityCenterView';
import ElbView from './views/ElbView';
import EksView from './views/EksView';
import AppRunnerView from './views/AppRunnerView';
import BackupView from './views/BackupView';
import AwsQView from './views/AwsQView';
import { useAws } from './contexts/AwsContext';
import { format } from 'date-fns';
import { Menu, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from './lib/utils';

const AppContent = () => {
  const { activity } = useAws();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = React.useState(true);

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
          <span>AWS Local Emulation Console</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className="flex-1 flex flex-col overflow-hidden w-full">
          <div className="flex-1 overflow-auto bg-white/50">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/s3" element={<S3View />} />
              <Route path="/dynamodb" element={<DynamoDBView />} />
              <Route path="/sqs" element={<SQSView />} />
              <Route path="/sns" element={<SNSView />} />
              <Route path="/lambda" element={<LambdaView />} />
              <Route path="/iam" element={<IAMView />} />
              <Route path="/secrets" element={<SecretsManagerView />} />
              <Route path="/codeartifact" element={<CodeArtifactView />} />
              <Route path="/ses" element={<SESView />} />
              <Route path="/kms" element={<KMSView />} />
              <Route path="/acm" element={<ACMView />} />
              <Route path="/events" element={<LiveEventsView />} />
              <Route path="/cloudwatch" element={<CloudWatchLogsView />} />
              <Route path="/eventbridge" element={<EventBridgeView />} />
              <Route path="/apigateway" element={<ApiGatewayView />} />
              <Route path="/rds" element={<RDSView />} />
              <Route path="/vpc" element={<VPCView />} />
              <Route path="/route53" element={<Route53View />} />
              <Route path="/stepfunctions" element={<StepFunctionsView />} />
              <Route path="/kinesis" element={<KinesisView />} />
              <Route path="/cloudformation" element={<CloudFormationView />} />
              <Route path="/cognito" element={<CognitoView />} />
              <Route path="/ecr" element={<ECRView />} />
              <Route path="/athena" element={<AthenaView />} />
              <Route path="/cloudfront" element={<CloudFrontView />} />
              <Route path="/elasticache" element={<ElastiCacheView />} />
              <Route path="/glue" element={<GlueView />} />
              <Route path="/ssm" element={<SSMView />} />
              <Route path="/waf" element={<WAFView />} />
              <Route path="/codebuild" element={<CodeBuildView />} />
              <Route path="/codepipeline" element={<CodePipelineView />} />
              <Route path="/appsync" element={<AppSyncView />} />
              <Route path="/marketplace" element={<MarketplaceView />} />
              <Route path="/roadmap" element={<RoadmapView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/ecs" element={<ECSView />} />
              <Route path="/redshift" element={<RedshiftView />} />
              <Route path="/opensearch" element={<OpenSearchView />} />
              <Route path="/msk" element={<MskView />} />
              <Route path="/sagemaker" element={<SageMakerView />} />
              <Route path="/iotcore" element={<IotCoreView />} />
              <Route path="/batch" element={<BatchView />} />
              <Route path="/transitgateway" element={<TransitGatewayView />} />
              <Route path="/beanstalk" element={<BeanstalkView />} />
              <Route path="/efs" element={<EfsView />} />
              <Route path="/neptune" element={<NeptuneView />} />
              <Route path="/cloudtrail" element={<CloudTrailView />} />
              <Route path="/identitycenter" element={<IdentityCenterView />} />
              <Route path="/elb" element={<ElbView />} />
              <Route path="/eks" element={<EksView />} />
              <Route path="/apprunner" element={<AppRunnerView />} />
              <Route path="/backup" element={<BackupView />} />
              <Route path="/awsq" element={<AwsQView />} />
            </Routes>
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

