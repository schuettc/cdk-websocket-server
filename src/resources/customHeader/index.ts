/* eslint-disable import/no-extraneous-dependencies */
import {
  CloudFrontClient,
  DistributionConfig,
  GetDistributionCommand,
  UpdateDistributionCommandInput,
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
  console.info('Event Received', JSON.stringify(event));
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
  const { DistributionId, Origins } = resourceProperties;
  console.log(`DistributionId: ${DistributionId}`);
  console.log(`Origins: ${JSON.stringify(Origins)}`);

  try {
    const { Distribution, ETag } = await client.send(
      new GetDistributionCommand({ Id: DistributionId }),
    );

    if (!Distribution) {
      throw new Error('CloudFront Distribution not found.');
    }

    console.log(`Etag: ${ETag}`);
    console.log(`Distribution: ${JSON.stringify(Distribution)}`);

    const updatedOrigins = Distribution.DistributionConfig!.Origins!.Items!.map(
      (origin: any) => {
        const matchedOrigin = Origins.find(
          (o: any) => o.OriginId === origin.Id,
        );
        if (matchedOrigin) {
          return {
            ...origin,
            CustomHeaders: {
              Quantity: matchedOrigin.CustomHeaders.length,
              Items: matchedOrigin.CustomHeaders.map((header: any) => ({
                HeaderName: header.HeaderName,
                HeaderValue: header.HeaderValue,
              })),
            },
          };
        }
        return origin;
      },
    );

    const updatedDistributionConfig: DistributionConfig = {
      ...Distribution.DistributionConfig!,
      Origins: {
        Quantity: updatedOrigins.length,
        Items: updatedOrigins,
      },
    };

    const updateParams: UpdateDistributionCommandInput = {
      Id: DistributionId,
      IfMatch: ETag,
      DistributionConfig: updatedDistributionConfig,
    };

    const updateResponse = await client.send(
      new UpdateDistributionCommand(updateParams),
    );

    console.info(`Response: ${JSON.stringify(updateResponse)}`);
    console.info(
      `CloudFront Distribution (${DistributionId}) updated with custom headers for origins.`,
    );
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error updating CloudFront Distribution.');
  }
}
