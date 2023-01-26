# CodeCast Blog API

### Configs

- <p>In this application im suing google auth to authenticate the users so you need to create a google app and get the client id and client secret</p>
- <p>For uploading the images to the cloud i am using cloudinary so you need to create an account and get the cloudinary url</p>
- <p>For sending the emails i am using sendgrid so you need to create an account and get the sendgrid api key</p>

###### Run the app in your local environment

<strong>First set the following environment variables</strong>
<strong>Env Variables </strong>

> PORT = 'Post where the app will be running'
> MONGODB_CONNECTION = 'Your MongoDB connection string'
> FE_LOCAL_URL = 'http://localhost:3000'
> GOOGLE_CLIENT_ID = 'your google client id'
> GOOGLE_CLIENT_SECRET = 'your google client secret'
> JWT_SECRET = to create a JWT secret you can run following command in your terminal `node -e "console.log(require('crypto').randomBytes(256).toString('base64'));"` this will generate a random string for you
> JWT_REFRESH_SECRET = Run the same command as above
> CLOUDINARY_URL= 'your cloudinary url'
> SENDGRID_API_KEY = 'your sendgrid api key'
> API_URL = 'http://localhost:5000' this is for the Google OAuth

## After your done with the above steps you can run the following commands in your terminal

#### Run the following commands in your terminal

- `git clone` this repo to your local machine
- `npm install`
- `npm run dev`
