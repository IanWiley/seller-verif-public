/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUser = /* GraphQL */ `
  query GetUser($username: String!) {
    getUser(username: $username) {
      username
      profileImage {
        bucket
        region
        key
      }
      driverImage {
        bucket
        region
        key
      }
      verificationAttempts
      verificationSuccessful
      createdAt
      updatedAt
    }
  }
`;
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $username: String
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listUsers(
      username: $username
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        username
        profileImage {
          bucket
          region
          key
        }
        driverImage {
          bucket
          region
          key
        }
        verificationAttempts
        verificationSuccessful
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
