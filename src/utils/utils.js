const AWS = require('aws-sdk');
const dotenv = require("dotenv");
const fs = require('fs');

dotenv.config();


async function documentExtract(imagePath = "", isRequest = false) {


  try {

    var bitmap = fs.readFileSync(imagePath);
    var bufferImage = new Buffer.from(bitmap);


    array = imagePath.split("/");
    let fileName;
    if (isRequest)
      fileName = array[array.length - 5] + "/" + array[array.length - 4] + "/" + array[array.length - 3] + "/" + array[array.length - 2] + "/" + array[array.length - 1];
    else
      fileName = array[array.length - 3] + "/" + array[array.length - 2] + "/" + array[array.length - 1];

    return new Promise(resolve => {
      var textract = new AWS.Textract({
        region: process.env.REGION,
        endpoint: process.env.TEXT_EXTRACT_URL,
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
      })

      console.log("imagePath : " + imagePath);
      console.log("FileName : " + fileName);
      var params = {
        Document: {
          Bytes: bufferImage,
          // S3Object: {
          //   Bucket: process.env.BUCKET_NAME,
          //   Name: fileName
          // }
        },
      }

      textract.detectDocumentText(params, (err, data) => {
        if (err) {
          console.log("Error amazon : " + err);
          resolve("error");
        } else {
          resolve(data);
        }
      })
    })

  } catch (error) {
    console.log("Error controlado en la funcion : documentExtract " + error)
  }



}


module.exports = { documentExtract };