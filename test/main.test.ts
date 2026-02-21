import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WebSocketServer } from '../src/stacks/cdk-websocket-server';

test('Snapshot', () => {
  const app = new App();
  const stack = new WebSocketServer(app, 'test', {});

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
