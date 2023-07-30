import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WebSocketServer } from '../src/cdk-websocket-server';

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

test('Snapshot', () => {
  const app = new App();
  const stack = new WebSocketServer(app, 'test', { env: devEnv });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
