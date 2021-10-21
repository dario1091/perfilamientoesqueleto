const company = "salesland";
const { readPaymentgSupport } = require(`./utils/companies/${company}.js`);
// const fs = require("fs");

async function worker() {
  try {
    // GENERAR .JSON AUTOMATIZADOS
    // await fs.readdir(`src/docs/${company}/1`, (err, files) => {
    //   setInterval(() => {
    //     if (err) {
    //       console.log("No existe el directorio 'docs'");
    //       return err;
    //     }
    //     files.map((f) => {
    //       let nameFile = f.split(".")[0];
    //       // console.log(nameFile);
    //       readPaymentgSupport(`src/docs/${company}/1/${f}`).then((response) => {
    //         if (response) {
    //           console.log(
    //             ":::::::::::::::    file generated    ::::::::::::::::::"
    //           );
    //           fs.writeFileSync(
    //             `json/${company}/1/${nameFile}.json`,
    //             JSON.stringify(response)
    //           );
    //         }
    //       });
    //     });
    //   }, 5000);
    // });

    // ----- AWS PATH FILE
    // let awsPathFile =
    //   "https://archivosavanzo.s3.us-east-2.amazonaws.com/1116446441/36/documentFront.png";

    let awsPathFile = `src/docs/${company}/1/paymentSupport-f93830768a9b640f.jpg`;

    await readPaymentgSupport(awsPathFile).then((response) => {
      if (response) {
        // console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::::::::    response    ::::::::::::::::::");
        // console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        // fs.writeFileSync(
        //   `json/${company}/1/paymentSupport-5957e6937a457800.json`,
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
