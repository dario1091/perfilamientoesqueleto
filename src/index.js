const company = "salesland";
const { readPaymentgSupport } = require(`./utils/companies/${company}.js`);
const fs = require("fs");

const folder = 2;

async function worker() {
  try {
    // GENERAR .JSON AUTOMATIZADOS
    // await fs.readdir(`src/docs/${company}/${folder}`, (err, files) => {
    //   setInterval(() => {
    //     if (err) {
    //       console.log("No existe el directorio 'docs'");
    //       return err;
    //     }
    //     files.map((f) => {
    //       let nameFile = f.split(".")[0];
    //       // console.log(nameFile);
    //       readPaymentgSupport(`src/docs/${company}/${folder}/${f}`).then(
    //         (response) => {
    //           if (response) {
    //             console.log(
    //               ":::::::::::::::    file generated    ::::::::::::::::::"
    //             );
    //             fs.writeFileSync(
    //               `json/${company}/${folder}/${nameFile}.json`,
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

    let awsPathFile = `src/docs/${company}/${folder}/paymentSupport-d38da2f88c5e46c3.jpeg`;
    await readPaymentgSupport(awsPathFile).then((response) => {
      if (response) {
        // console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::::::::    response    ::::::::::::::::::");
        // console.log(":::::::::::::::::::::::::::::::::::::::::::::::::");
        // fs.writeFileSync(
        //   `json/${company}/${folder}/paymentSupport-4135697453e8cdc1-1.json`,
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
