import {
  CloudFrontClient,
  GetDistributionCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import {
  CdkCustomResourceEvent,
  CdkCustomResourceResponse,
  Context,
} from 'aws-lambda';

const client = new CloudFrontClient({ region: 'us-east-1' });

const response: CdkCustomResourceResponse = {};

export const handler = async (
  event: CdkCustomResourceEvent,
  context: Context,
): Promise<CdkCustomResourceResponse> => {
  console.info('Event Received', event);
  const requestType = event.RequestType;
  const resourceProperties = event.ResourceProperties;

  response.StackId = event.StackId;
  response.RequestId = event.RequestId;
  response.LogicalResourceId = event.LogicalResourceId;
  response.PhysicalResourceId = context.logGroupName;

  switch (requestType) {
    case 'Create':
      console.info('Updating CloudFront Distribution Custom Headers');
      await updateCloudFrontDistribution(resourceProperties);
      break;
    case 'Update':
      console.info('Updating CloudFront Distribution Custom Headers');
      await updateCloudFrontDistribution(resourceProperties);
      break;
    case 'Delete':
      console.log('Not handling Delete');
      break;
  }

  console.log(`Response: ${JSON.stringify(response)}`);
  return response;
};

async function updateCloudFrontDistribution(resourceProperties: any) {
  const { DistributionId, CustomHeaders } = resourceProperties;

  try {
    const { Distribution } = await client.send(
      new GetDistributionCommand({ Id: DistributionId }),
    );

    const updatedDistribution = {
      ...Distribution,
      DistributionConfig: {
        ...Distribution.DistributionConfig,
        CustomHeaders: {
          Quantity: CustomHeaders.length,
          Items: CustomHeaders.map(
            (header: { HeaderName: string; HeaderValue: string }) => ({
              HeaderName: header.HeaderName,
              HeaderValue: header.HeaderValue,
            }),
          ),
        },
      },
      IfMatch: Distribution.ETag,
    };

    await client.send(new UpdateDistributionCommand(updatedDistribution));

    console.info(
      `CloudFront Distribution (${DistributionId}) updated with custom headers.`,
    );
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error updating CloudFront Distribution.');
  }
}
