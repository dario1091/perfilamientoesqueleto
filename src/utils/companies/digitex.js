var path = require("path");
const { documentExtract } = require("../utils.js");

const readPaymentgSupport = (filePath, isRequest = false) =>
  new Promise((resolve, reject) => {
    try {
      let ext = path.extname(filePath);

      let arrayTextLine = [];

      let jsonClient = {
        name: "",
        banco: {
          name: "",
          account: "",
        },
        cargo: "",
        salud: "",
        basico: "",
        nomina: "",
        pension: "",
        convenio: "",
        fechaIngreso: "",
        devengos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        confidence: null,
        sueldoNeto: null,
        deducciones: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        documentNumber: "",
      };

      let jsonCompany = {
        nit: "",
        name: "",
      };

      if (ext === ".png" || ext === ".jpeg" || ext === ".jpg") {
        (async () => {
          let jsonToRead = await documentExtract(filePath, isRequest);

          if (jsonToRead != "error") {
            /**
             * sacamos todas las lineas leidas
             */

            for (const block of jsonToRead.Blocks) {
              if (
                block.BlockType === "LINE" &&
                block.Geometry.BoundingBox.Left < 0.5
              ) {
                let strTop =
                  block.Geometry.BoundingBox.Top.toString().substring(0, 6);

                let pos = -1;
                for (let index = 0; index < arrayTextLine.length; index++) {
                  const element = arrayTextLine[index];
                  if (Math.abs(element.top - parseFloat(strTop)) < 0.005) {
                    pos = index;
                    break;
                  }
                }
                if (pos !== -1) {
                  arrayTextLine[pos].arrayText.push({
                    top: strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  console.log("POS -------------------------------> " + pos);
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      top: ":::" + strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }
                if (block.Text.toUpperCase().startsWith("COMDATA")) {
                  jsonCompany.name = block.Text;
                }
                if (block.Text.toUpperCase().startsWith("NIT:900038933-6")) {
                  jsonCompany.nit = block.Text;
                }
              }
            }
          }

          console.log(
            "JSON COMPANY ----------------------------------------------------------"
          );

          console.log(jsonCompany);
          arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(arrayTextLine) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
