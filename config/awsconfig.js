const AWS = require('aws-sdk');
const multer = require('multer');
const fs=require("fs");
const{AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION,AWS_S3_BUCKET_NAME,SIGNED_URL_EXPIRATION}= require("../config");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);


const { S3Client,
    GetObjectCommand} = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");



// Configure AWS SDK
const s3 = new AWS.S3({
    accessKeyId:AWS_ACCESS_KEY_ID,
    secretAccessKey:AWS_SECRET_ACCESS_KEY,
    region:AWS_REGION,
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads'); // Store files in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        // const { username} = req.body;
        const externalid=nanoid();
        // console.log("hello");
        const uniqueName = `${externalid}.${file.originalname.split('.').pop()}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage: storage });



const uploadFileToS3 = (filePath, fileName) => {
    return new Promise((resolve, reject) => {
        const fileContent = fs.readFileSync(filePath);

        const params = {
            Bucket:AWS_S3_BUCKET_NAME,
            Key: `external/${fileName}`,
            Body: fileContent,
            // ACL: 'public-read',
        };

        s3.upload(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                //Remove the file from the local uploads folder
                fs.unlinkSync(filePath);
                resolve(data.Location);
            }
        });
    });
};






const S3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
  

const getSignedUrlForRead = async (fileName) => {
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key:`external/${fileName}`,
    });
  
    const signedUrl = await getSignedUrl(S3, command, {
      expiresIn: SIGNED_URL_EXPIRATION,
    });
  
    return signedUrl;
  };

const getInternalSignedUrlForRead = async (fileName) => {
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: fileName,
    });
  
    const signedUrl = await getSignedUrl(S3, command, {
      expiresIn: SIGNED_URL_EXPIRATION,
    });
  
    return signedUrl;
  };


module.exports = {s3,upload,uploadFileToS3,getSignedUrlForRead,getInternalSignedUrlForRead};
