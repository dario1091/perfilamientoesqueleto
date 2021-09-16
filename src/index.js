




const { readPaymentgSupport } = require('./utils/companies/company.js');


async function worker() {



  try {


   //let awsPathFile="https://archivosavanzo.s3.us-east-2.amazonaws.com/1116446441/36/documentFront.png";
   let awsPathFile="src/docs/paymentSupport-159396f2f8677d9f.png" 
   await readPaymentgSupport(awsPathFile).then(response => {

      if (response) {
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::::::::    response    ::::::::::::::::::");
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        // console.log(JSON.parse(JSON.stringify(response)));
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
      }


    });





  } catch (error) {
    console.log(error);

  }






}





worker().catch(error => console.log(error.stack));



