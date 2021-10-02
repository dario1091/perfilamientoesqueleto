const { readPaymentgSupport } = require("./utils/companies/contactamos.js");
// const fs = require("fs");

async function worker() {
  try {
    // GENERAR .JSON AUTOMATIZADOS
    // await fs.readdir("src/docs/digitex/2", (err, files) => {
    //   // setInterval(() => {
    //   if (err) {
    //     console.log("No existe el directorio 'docs'");
    //     return err;
    //   }
    //   files.map((f) => {
    //     let nameFile = f.split(".")[0];
    //     console.log(nameFile);
    //     readPaymentgSupport(`src/docs/digitex/2/${f}`).then((response) => {
    //       if (response) {
    //         console.log(
    //           ":::::::::::::::    file generated    ::::::::::::::::::"
    //         );
    //         fs.writeFileSync(
    //           `json/digitex/2/${nameFile}.json`,
    //           JSON.stringify(response)
    //         );
    //       }
    //     });
    //   });
    //   // }, 5000);
    // });

    // ----- AWS PATH FILE
    // let awsPathFile="https://archivosavanzo.s3.us-east-2.amazonaws.com/1116446441/36/documentFront.png";
    let awsPathFile = "src/docs/contactamos/1/paymentSupport.jpg";

    await readPaymentgSupport(awsPathFile).then((response) => {
      if (response) {
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::::::::    response    ::::::::::::::::::");
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        // response.map((x) => console.log(x));
        // fs.writeFileSync(
        //   "json/digitex/2/30570-1-1030556844-20200804.json",
        //   JSON.stringify(response)
        // );
        console.log(JSON.parse(JSON.stringify(response)));
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
      }
    });
  } catch (error) {
    console.log(error);
  }
}

worker().catch((error) => console.log(error.stack));
