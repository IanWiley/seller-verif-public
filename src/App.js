import React, {useState, useReducer, useEffect} from 'react'
import './App.css';
import {v4 as uuid} from 'uuid'

import '@aws-amplify/ui-react/styles.css';
import {Authenticator} from '@aws-amplify/ui-react'
import config from './aws-exports'
import Amplify from '@aws-amplify/core';
import Auth from '@aws-amplify/auth';
import { Storage, API, graphqlOperation } from 'aws-amplify'
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition'

import {createUser as CreateUser, updateUser as UpdateUser} from './graphql/mutations'
import {  listUsers } from './graphql/queries'
import * as queries from './graphql/queries'
import {onCreateUser} from './graphql/subscriptions'

require('dotenv').config()

Amplify.configure(config)

const {
  aws_user_files_s3_bucket_region: region,
  aws_user_files_s3_bucket: bucket
} = config

const initialState = {
  users: []
}

function reducer(state, action) {
  switch(action.type) {
    case 'SET_USERS':
      return { ...state, users: action.users }
    case 'ADD_USER':
      return { ...state, users: [action.user, ...state.users] }
    default:
      return state
  }
}

export default function App() {
  const [profileFile, updateFile] = useState(null)
  const [driverFile, updateDriverFile] = useState(null)
  const [state, dispatch] = useReducer(reducer, initialState)
  const [profileImageUrl, updateprofileImageUrl] = useState('')

  function handleProfileChange(event) {
    const { target: { value, files } } = event
    const [image] = files || []
    updateFile(image || value)
  }

  function handleDriverChange(event) {
    const { target: { value, files } } = event
    const [image] = files || []
    updateDriverFile(image || value)
  }

  async function fetchImage(key) {
    try {
      const imageData = await Storage.get(key)
      updateprofileImageUrl(imageData)
    } catch(err) {
      console.log('error: ', err)
    }
  }

  async function fetchUsers() {
    try {
     let users = await API.graphql(graphqlOperation(listUsers))
     users = users.data.listUsers.items
     dispatch({ type: 'SET_USERS', users })
    } catch(err) {
      console.log('error fetching users')
    }
  }

  // Checks if user's Cognito Username exists in the User DynamoDB table on page load,
  // and adds that user if they don't yet exist
  async function newUserCheck() {
    let user = await Auth.currentAuthenticatedUser();

    try{
      console.log("Checking if user exists")
      let userList = await API.graphql(graphqlOperation(listUsers))
      userList = userList.data.listUsers.items

      var usernamesList = userList.map(function(item) {return item.username})

      var userExists = false;
      usernamesList.forEach(element => {
        if(element == user.username)
        {
          userExists = true
          console.log("user does exist")
        }
      });

      if(!userExists){
        console.log("user does not yet exist, adding to table")
        const inputData = {username: user.username, verificationAttempts: 0, verificationSuccessful: false}

        await API.graphql(graphqlOperation(CreateUser, {input: inputData}))
      }
    } catch (err) {
      console.log(err)
    }
  }

  // updateUser() is the primary function that takes the seller's images and verifies them, 
  // as well as updating the user table in DynamoDB
  async function updateUser(event) {
    event.preventDefault()
    
    let user = await Auth.currentAuthenticatedUser();

    var currentVerificationAttempts
    await API.graphql(graphqlOperation(queries.getUser, { username: user.username })).then(
      (result) => {
        currentVerificationAttempts = result.data.getUser.verificationAttempts
      },
      (error) => {
        console.log(error)
      }
    )

    currentVerificationAttempts++
    const verifInputData = {username: user.username, verificationAttempts: currentVerificationAttempts}
    await API.graphql(graphqlOperation(UpdateUser, { input: verifInputData}))
    console.log("Verification Attempt # " + currentVerificationAttempts)

    // Adds S3 bucket/key info for file uploads
    if (profileFile && driverFile) {
        const { name: profileFileName, type: mimeType } = profileFile
        const profileKey = `profile_${uuid()}${profileFile.name}`
        const profileUpload = {
            bucket,
            key: profileKey,
            region,
        }

        const driverKey = `driver_${uuid()}${driverFile.name}`
        const driverUpload = {
            bucket,
            key: driverKey,
            region,
        }

        const inputData = { username: user.username, profileImage: profileUpload, driverImage: driverUpload}

        // Adds files to S3 bucket
        try {
          await Storage.put(profileKey, profileFile, {
            contentType: mimeType
          })
          await Storage.put(driverKey, driverFile, {
            contentType: mimeType
          })
          await API.graphql(graphqlOperation(UpdateUser, { input: inputData }))

          var userInfo
          await API.graphql(graphqlOperation(queries.getUser, { username: user.username })).then(
              (result) => {
                userInfo = result.data.getUser
              },
              (error) => {
                console.log(error)
              }
            )

          console.log("Retrieving bucket and keys")

          const bucket        = userInfo.profileImage.bucket // the bucketname without s3://
          const photo_source  = 'public/' + userInfo.profileImage.key
          const photo_target  = 'public/' + userInfo.driverImage.key

          console.log("Creating new RekognitionClient")
          const client = new RekognitionClient({ 
            region: "us-east-2",
            credentials: {
              accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
          }
        });

          console.log("Preparing Rekognition params")
          const params = {
              SourceImage: {
                S3Object: {
                  Bucket: bucket,
                  Name: photo_source
                },
              },
              TargetImage: {
                S3Object: {
                  Bucket: bucket,
                  Name: photo_target
                },
              },
              SimilarityThreshold: 50
            }

          console.log("Preparing Rekognition command")
          const command = new CompareFacesCommand(params);

          console.log("sending command: " + JSON.stringify(command))

          var similarPercent = 0  // Similarity of two images

          client.send(command).then(
            (data) => {
              data.FaceMatches.forEach(data => {
                let position   = data.Face.BoundingBox
                let similarity = data.Similarity
                similarPercent = data.Similarity
                console.log(`The face at: ${position.Left}, ${position.Top} matches with ${similarity} % confidence`)
              })

              if (similarPercent > 90) {
                console.log("Image meets threshold, verification successful. " + similarPercent + "%" +" > 90" + "%");
                const rekogInputData = {username: user.username, verificationSuccessful: true}
                API.graphql(graphqlOperation(UpdateUser, { input: rekogInputData }))
                alert("Verification successful. Welcome to the RacerX Marketplace!")
              } 
              else{
                console.log("Image does not meet threshold, verification unsuccessful. " + similarPercent + "%" +" <= 90" + "%")
                const rekogInputData = {username: user.username, verificationSuccessful: false}
                API.graphql(graphqlOperation(UpdateUser, { input: rekogInputData }))
                alert("Verification unsuccessful. Please try again.")
              }
            },
            (error) => {
              alert("Verification unsuccessful. Please try again.")
              const rekogInputData = {username: user.username, verificationSuccessful: false}
              API.graphql(graphqlOperation(UpdateUser, { input: rekogInputData }))
              console.log(error,error.stack)
            }
          );
          console.log('Successfully stored user data!')
        } catch (err) {
          console.log('error: ', err)
        }
    }
  }

  useEffect(() => {
    fetchUsers()
    newUserCheck()
    const subscription = API.graphql(graphqlOperation(onCreateUser))
      .subscribe({
        next: async userData => {
          const { onCreateUser } = userData.value.data
          dispatch({ type: 'ADD_USER', user: onCreateUser })
        }
      })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Authenticator signUpAttributes={[
      'name',
      'birthdate',
      'email',
    ]}>
      {({ signOut, user }) => (
      <div style={styles.container}>
        <h1>RacerX Seller Onboarding Prototype</h1>
        <h2>Hello, {user.username}!</h2>
          <button
          style={styles.button}
           onClick={signOut}>Sign out</button>
        <h3>Profile Picture</h3>
          <input
            label="File to upload"
            id = "profile-upload"
            type="file"
            accept ="image/*"
            onChange={handleProfileChange}
            style={{margin: '10px 0px'}}
          />
        <h3>Driver's License</h3>
          <input
            label="DLUpload"
            id = "driver-upload"
            type="file"
            accept ="image/*"
            onChange={handleDriverChange}
            style={{margin: '10px 0px'}}
          />
        <button
          style={styles.button}
          onClick={updateUser}>Verify Images</button>

        <img
          src={profileImageUrl}
          style={{ width: 300 }}
        />
    </div>
      )}
    </Authenticator>
  );
}

const styles = {
  container: {
    width: 800,
    margin: '0 auto'
  },
  button: {
    width: 200,
    backgroundColor: '#ddd',
    cursor: 'pointer',
    height: 30,
    margin: '0px 0px 8px'
  }
}