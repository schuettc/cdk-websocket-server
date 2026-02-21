import { App, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { WebSocketServer } from '../src/stacks/cdk-websocket-server';

test('No unsuppressed Errors', () => {
  const app = new App();
  const stack = new WebSocketServer(app, 'test', {});

  Aspects.of(stack).add(new AwsSolutionsChecks());

  const errors = Annotations.fromStack(stack).findError(
    '*',
    Match.stringLikeRegexp('AwsSolutions-.*'),
  );

  if (errors.length > 0) {
    console.log(errors);
  }
  expect(errors).toHaveLength(0);
});
