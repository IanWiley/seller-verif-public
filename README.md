# RacerX Seller Onboarding Prototype - UTD ITSS 4395 Fall 2021 Capstone 

This project leverages AWS Amplify and Rekogntion to build a full stack Seller Onboarding Application in Javascript. The primary focus was to use Rekognition to detect the level of similarity between a user's profile image and their driver's license/official identification. In addition, we supported that function with file storage, user accounts, and a user info table.

## Architecture

The prototyping process took a "front-heavy" approach, where the majority of the application's code runs in the App.js frontend script. The goal of that was to keep the prototype on a small, easy-to-manage scale since we had little prior experience with Javascript.

The services used in this project include:

- React
- Node.JS
- Dotenv
- AWS Amplify
- AWS Rekognition
    - CompareFaces
- AWS Cognito User Pools
- AWS S3
    - Create and Read permissions for Authenticated users
- AWS DynamoDB
    - GraphQL is used to perform write and update operations
    - Schema:
```
type User @model  {
  username: String!  @primaryKey
  profileImage: S3Object
  driverImage: S3Object
  verificationAttempts: Int
  verificationSuccessful: Boolean
}

type S3Object {
  bucket: String!
  region: String!
  key: String!
}

```

## Process Flow

1. User arrives at the Cognito Sign-in screen
    - IF USER DOESN'T HAVE ACCOUNT
        - User creates account by providing
            - Username (unique identifier, used as primary key in user table)
            - Password
            - Name
            - Birthdate
            - Email
        - Verification code emailed to user
        - User's account is confirmed
    - IF USER HAS ACCOUNT
        - User signs in by providing
            - Username
            - Password
2. User arrives at Seller Verification screen
    - IF THIS IS FIRST SIGN IN
        - To check if user has new account, application loops through usernames in table on page load to see if there is a match with the Cognito username
        - If there is no match, an entry in the user table is initialized
        - CreateUser function
3. User chooses Profile Picture and Drivers License images from their computer 
4. User clicks "Verify Images" button
5. Verification attempt begins
    - UpdateUser function
6. User table entry updated with intended S3 Bucket, Region, and Key for the two images  
7. Images are uploaded to S3 bucket
8. Image S3 bucket & keys are passed to Rekognition Client parameters as S3 Objects
9. S3 CompareFaces command is run with these parameters, returning a similarity value
    - IF SIMILARITY > 90%
        - Verification successful
        - Recorded in user table entry as 'verificationSuccessful = true'
    - IF SIMILARITY <= 90%
        - Verification unsuccessful
        - Recorded in user table entry as 'verificationSuccessful = false'
10. Process complete, user can re-run verification steps 3-9 as many times as necessary

## Installation

amplify init --app https://github.com/IanWiley/seller-verif-v1.git

Select the authentication method you want to use > AWS profile

Choose profile > default

amplify push

Do you want to update code for your updated GraphQL API> Yes
? Do you want to generate GraphQL statements (queries, mutations and subscription) based on your schema types?
This will overwrite your current graphql queries, mutations and subscriptions> Yes

### Create .env file in root directory

```
REACT_APP_AWS_ACCESS_KEY_ID = "ACCESS_KEY_IN_QUOTES"
REACT_APP_AWS_SECRET_ACCESS_KEY = "SECRET_KEY_IN_QUOTES"
```

### Manual Hosting

amplify hosting add
? Select the plugin module to execute Hosting with Amplify Console> (Managed hosting with custom domains, Continuous deployment)
? Choose a type> Manual deployment

amplify publish

## Future Considerations for Implementation

- Due to time constraints, the Rekognition Client Credentials rely on hardcoded Access Key and Secret Key credentials
    - Amplify prototype websites should be password protected for the time being
    - AWS Secrets Manager seems like a viable alternative 
    - https://aws.amazon.com/secrets-manager/
- One weakness of the current implementation is that users can upload a duplicate image and pass verification. 
    - Would suggest rectifying this by detecting whether Drivers License upload actually is a DriversLicense
    - Could possibly use DetectLabels Rekognition function
- App.js functions should be modularized to simplify code
- Rekognition labelling count be used further

## Appendix/References

This is where I'll list out the reference material that was the most helpful in completing this project

This tutorial is what the project was most heavily adapted from.
https://dev.to/dabit3/graphql-tutorial-how-to-manage-image-file-uploads-downloads-with-aws-appsync-aws-amplify-hga

Official documentation for 'Rekognition Client - AWS SDK for JavaScript v3'.
https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rekognition/index.html
https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rekognition/classes/comparefacescommand.html

Up to date documentation on GraphQL Schema and Primary Key behavior.
https://aws.amazon.com/blogs/mobile/aws-amplify-announces-the-new-graphql-transformer-v2-more-feature-rich-flexible-and-extensible/

Up to date Amplify Authenticator (Cogntio) documentation. 
https://ui.docs.amplify.aws/components/authenticator