const { readPaymentgSupport } = require("./utils/companies/digitex.js");
const fs = require("fs");

async function worker() {
  try {
    //let awsPathFile="https://archivosavanzo.s3.us-east-2.amazonaws.com/1116446441/36/documentFront.png";
    let awsPathFile = "src/docs/paymentSupport-e0d86fabde5a4c1d.jpg";
    await readPaymentgSupport(awsPathFile).then((response) => {
      if (response) {
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::::::::    response    ::::::::::::::::::");
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        // console.log(response)
        // response.map((x) => console.log(x));
        // console.log(JSON.parse(JSON.stringify(response)));
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
      }
    });
  } catch (error) {
    console.log(error);
  }
}

worker().catch((error) => console.log(error.stack));
