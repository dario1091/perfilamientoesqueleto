const { readPaymentgSupport } = require("./utils/companies/contactamos.js");
const fs = require("fs");

async function worker() {
  try {
    // GENERAR .JSON AUTOMATIZADOS
    // await fs.readdir("src/docs/contactamos/1", (err, files) => {
    //   setInterval(() => {
    //     if (err) {
    //       console.log("No existe el directorio 'docs'");
    //       return err;
    //     }
    //     files.map((f) => {
    //       let nameFile = f.split(".")[0];
    //       console.log(nameFile);
    //       readPaymentgSupport(`src/docs/contactamos/1/${f}`).then(
    //         (response) => {
    //           if (response) {
    //             console.log(
    //               ":::::::::::::::    file generated    ::::::::::::::::::"
    //             );
    //             fs.writeFileSync(
    //               `json/contactamos/1/${nameFile}.json`,
    //               JSON.stringify(response)
    //             );
    //           }
    //         }
    //       );
    //     });
    //   }, 5000);
    // });
    // ----- AWS PATH FILE
    // let awsPathFile =
    //   "https://archivosavanzo.s3.us-east-2.amazonaws.com/1116446441/36/documentFront.png";

    let awsPathFile =
      "src/docs/contactamos/1/paymentSupport-5957e6937a457800.jpg";

    await readPaymentgSupport(awsPathFile).then((response) => {
      if (response) {
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::::::::    response    ::::::::::::::::::");
        console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        // fs.writeFileSync(
        //   "json/contactamos/1/paymentSupport-5957e6937a457800.json",
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
