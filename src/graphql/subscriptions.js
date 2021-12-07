/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUser = /* GraphQL */ `
  subscription OnCreateUser {
    onCreateUser {
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
export const onUpdateUser = /* GraphQL */ `
  subscription OnUpdateUser {
    onUpdateUser {
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
export const onDeleteUser = /* GraphQL */ `
  subscription OnDeleteUser {
    onDeleteUser {
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
