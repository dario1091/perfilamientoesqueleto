var path = require("path");
const { documentExtract } = require("../utils.js");

const readPaymentgSupport = (filePath, isRequest = false) =>
  new Promise((resolve, reject) => {
    try {
      let ext = path.extname(filePath);

      let arrayTextLine = [];

      /**
       * Json de resultado
       */
      let resultObject = {};

      /**
       * Left de devengos
       */
      let leftEarns = 0;

      /**
       * Left de descuentos
       */
      let leftDiscounts = 0;

      let contConfidence = 0;
      let totalDatos = 0;

      let client = {
        name: "",
        banco: {
          name: "",
          account: "",
        },
        cargo: "NO REGISTRA",
        salud: "NO REGISTRA",
        basico: "",
        nomina: "",
        pension: "NO REGISTRA",
        convenio: "",
        // fechaIngreso: "",
        devengos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        confidence: null,
        sueldoNeto: null,
        descuentos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        documentNumber: "",
      };

      let company = {
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
              if (block.BlockType === "LINE") {
                let strTop =
                  block.Geometry.BoundingBox.Top.toString().substring(0, 6);

                // console.log(block);

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
                    // top: strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      // top: ":::" + strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }

                // Captura de valores left devengos
                if (
                  block.Text.toUpperCase().startsWith(
                    "CONCEP DESCRIPCION CONCEPTO"
                  )
                ) {
                  leftEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // Captura de valores left descuentos
                if (block.Text.toUpperCase().startsWith("CENTRO COSTO")) {
                  leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Posición inicial de tabla de dev/ded
           */
          let init =
            arrayTextLine
              .map((e) => {
                return e.arrayText[0].text;
              })
              .indexOf("CONCEP DESCRIPCIÓN CONCEPTO") === -1
              ? arrayTextLine
                  .map((e) => {
                    return e.arrayText[0].text;
                  })
                  .indexOf("CONCEP DESCRIPCION CONCEPTO")
              : arrayTextLine
                  .map((e) => {
                    return e.arrayText[0].text;
                  })
                  .indexOf("CONCEP DESCRIPCIÓN CONCEPTO");

          /**
           * Posición final de tabla de dev/ded y campo
           * de subtotales devengos y deducciones
           */
          let calcEnd = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("Firma:");

          let end = arrayTextLine[calcEnd - 3].arrayText[0]?.text.includes(
            "NETO:"
          )
            ? calcEnd - 4
            : calcEnd - 3;

          // GUARDANDO REFERENCIAS DE SUBTOTALES Y LEFTS DE DEVENGOS Y DEDUCCIONES

          /**
           * Referencia del bloque donde se encuentran los subtotales
           */
          let bloque = 0;
          // Subtotal de devengos y descuentos(deducciones)
          if (arrayTextLine[end].arrayText[0]?.text.includes("NETO:")) {
            bloque = end - 1;
            // EL BLOQUE TIENE NETO
            client.devengos.subtotal =
              arrayTextLine[bloque].arrayText[0]?.text.split("$ ")[1];
            client.descuentos.subtotal =
              arrayTextLine[bloque].arrayText[1]?.text.split("$ ")[1];
          } else {
            // EL BLOQUE TIENE LA REFERENCIA DE SUBTOTALES
            client.devengos.subtotal = arrayTextLine[end].arrayText[0]?.text
              .split("$")[1]
              .trim();
            client.descuentos.subtotal = arrayTextLine[end].arrayText[1]?.text
              .split("$")[1]
              .trim();
          }

          /**
           * Recorrido del documento para capturar datos fijos donde se
           * declaran 2 variables
           * @bloque que por defecto el valor del dato esta siempre 1 campo
           * debajo del header
           * @columna para ubicar respectivamente el dato por bloque, teniendo
           * en cuenta que cada bloque tiene distintas columnas. Además de que
           * 0 -> Es la primera ya que se devuelve como un Array
           */

          // NOTA: LOS TEXTOS QUE NO TIENEN COHERENCIA EN LAS
          // VALIDACIONES SON CASOS ESPECIFICOS DE DOCUMENTOS
          // QUE NO SON BIEN LEIDOS
          // guardar solo numeros .replace(/\D/g, "")
          // guardar solo texto .replace(/[0-9]+/g, "")

          /**
           * sacamos todas las lineas leidas
           */
          for (let i = 0; i < arrayTextLine.length; i++) {
            let block = i + 1;
            let columna = 0;

            arrayTextLine[i].arrayText.map((x) => {
              // GUARDANDO CONVENIO ###################### ----------------------------------
              if (x.text.startsWith("CENTRO DE UTILIDAD")) {
                let codigoDividido = "";

                // Si el bloque de abajo empieza con el codigo 0 viene el nombre del convenio
                if (
                  arrayTextLine[block].arrayText[columna]?.text.startsWith(
                    "0"
                  ) ||
                  arrayTextLine[block].arrayText[columna]?.text.startsWith("1")
                ) {
                  codigoDividido =
                    arrayTextLine[block].arrayText[columna]?.text.split(" ");
                } else {
                  // El bloque de abajo viene con otro texto o marca de agua
                  codigoDividido =
                    arrayTextLine[block + 1].arrayText[columna]?.text.split(
                      " "
                    );
                }

                let textConvenioSeparado = codigoDividido.slice(2);
                let textConvenio = textConvenioSeparado.join(" ");

                client.convenio = textConvenio;
              }

              // GUARDANDO NOMBRE, CEDULA, SALARIO BASE (DEPENDIENDO DE)
              // LA LINEA ###################### ----------------------------------
              if (x.text.includes("NOMBRE")) {
                // Guardando Salario base dependiendo de la linea
                let textOtroBloque = arrayTextLine[i + 4].arrayText[0]?.text;
                if (textOtroBloque.includes("$")) {
                  // Sueldo en la misma linea
                  let obtenerSueldo = textOtroBloque.split("$ ")[1];
                  let sueldo = obtenerSueldo.split(" ")[0];
                  client.basico = sueldo;
                } else {
                  // Guardando sueldo base
                  client.basico = x.text.split("$ ")[1];
                }

                // Guardando numero de cedula
                let textInicioDocumento = x.text.split("(")[1];
                let numDocumento = textInicioDocumento.split(")")[0];
                client.documentNumber = numDocumento;

                // Guardando nombre del cliente
                let nameSeparado = x.text.split(":")[2].trim();
                let name = nameSeparado.split(" (")[0];
                client.name = name;
              }

              // GUARDANDO SUELDO NETO ###################### ----------------------------------
              if (x.text.includes("NETO: ")) {
                client.sueldoNeto = x.text.split("$ ")[1];
              }

              // GUARDANDO NUMERO DE CUENTA BANCARIA Y NOMBRE
              // ###################### ----------------------------------
              if (x.text.toUpperCase().startsWith("MODO PAGO:")) {
                if (x.text.includes("<Ninguno>")) {
                  client.banco.account = "NO REGISTRA";
                  client.banco.name = "NO REGISTRA";
                } else {
                  client.banco.account = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/\D/g, "");

                  let separarCad = x.text.split(" ");
                  let ubicacionBanco = separarCad.indexOf("BANCO");
                  let name = separarCad.slice(ubicacionBanco);
                  client.banco.name = name.join(" ");
                }
              }

              // GUARDANDO FECHA DE NOMINA ###################### -------------------------------
              if (x.text.includes("PERIODO:")) {
                let lengthCadena = x.text.split(" ").length;
                let capturaFecha = "";
                // Codigo periodo pegado a la primera fecha
                if (lengthCadena === 4) {
                  capturaFecha = x.text.split(" ")[3];
                } else if (lengthCadena === 5) {
                  // Codigo periodo despegado a la primera fecha
                  capturaFecha = x.text.split(" ")[4];
                } else if (lengthCadena === 3) {
                  capturaFecha = x.text.split(" ")[2];
                }
                let dividirFecha = capturaFecha.split("(")[1];
                let fecha = dividirFecha.split(")")[0];
                client.nomina = fecha;
              }

              // GUARDANDO NOMBRE DE EMPRESA Y NIT ###################### ------------------
              if (x.text.toUpperCase().includes("EMPRESA:")) {
                // Datos del nit
                let dividirNit = "";
                let nit = "";

                // Datos de la empresa
                let dividirEmpresa = x.text.split(": ")[1];
                let name = dividirEmpresa.split("(")[0];

                // Si el nombre de la empresa no captura numeros
                if (isNaN(parseInt(x.text.replace(/\D/g, "")))) {
                  // SOLO VIENE TEXTO
                  company.name = name;

                  // se guarda el nit del bloque i + 6 (Caso especial)
                  // Y si viene el sueldo base junto con el
                  // Sino esta en i+6, se guarda el caso especial i+4
                  // let nit4bloque = arrayTextLine[i + 4].arrayText[0]?.text;
                  let nit6bloque = arrayTextLine[i + 6].arrayText[0]?.text;

                  if (nit6bloque.includes("(")) {
                    dividirNit = nit6bloque.split("(")[1];
                  } else {
                    dividirNit = nit4bloque.split("(")[1];
                  }
                  nit = dividirNit.split(")")[0];
                  company.nit = nit;
                } else {
                  // NOMBRE DE EMPRESA Y NIT EN LA MISMA LINEA
                  company.name = name;

                  dividirNit = x.text.split("(")[1];
                  nit = dividirNit.split(")")[0];

                  // Si el nit incluye un guión
                  if (x.text.includes("-")) {
                    company.nit = nit;
                  } else {
                    company.nit = x.text.replace(/\D/g, "");
                  }
                }
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              contConfidence += x.confidence;
              totalDatos++;
              client.confidence = (contConfidence / totalDatos).toFixed(2);
            });
          }

          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDescuentos = {};

          // Recorriendo la tabla

          /**
           * Recorrido unico de la tabla, que guarda dependiendo si es un
           * devengo o un descuento los valores en los Objetos @elementDevengos
           * o @elementDescuentos respectivamente los datos de la columna
           *
           * Estos se validan dependiendo de la coordenada left si hay un dato
           * vacio se guarda como 0 y si hay un dato que no corresponde a la respectiva
           * columna se corre a la columna perteneciente
           *
           * Siendo asi 4 columnas para devengos y 4 columnas para deducciones
           *                                  Devengos
           * arrayTextLine[i].arrayText[0] -> Columna Concepto
           * arrayTextLine[i].arrayText[1] -> Columna Descripcion
           * arrayTextLine[i].arrayText[2] -> Columna Cantidad
           * arrayTextLine[i].arrayText[3] -> Columna Devengos
           *
           *                                  Deducciones
           * arrayTextLine[i].arrayText[4] -> Columna Centro costo
           * arrayTextLine[i].arrayText[5] -> Columna Concepto
           * arrayTextLine[i].arrayText[6] -> Columna Descripcion
           * arrayTextLine[i].arrayText[7] -> Columna Descuento
           */

          console.log(init);
          console.log(end);
          // console.log(arrayTextLine[end]);

          /**
           * Referencias left de las columnas de la tabla
           */

          let leftCentroCosto;
          let leftCantidad;
          arrayTextLine[init].arrayText.map((x) => {
            if (x.text.includes("CENTRO")) {
              leftCentroCosto = x?.left;
            }
            if (x.text.includes("CANTIDAD")) {
              leftCantidad = x?.left;
            }
          });

          // SI NO HAY DATOS EN LA TABLA
          if (init + 1 === end) {
            client.devengos.confidence = "0";
            client.descuentos.confidence = "0";
          }

          //TODO: LECTURA DE DEVENGOS Y DEDUCCIONES
          for (let i = init + 1; i < end; i++) {
            /**
             * Variables combinadas
             */

            // Bloques con todos los datos
            if (arrayTextLine[i].arrayText.length >= 3) {
              arrayTextLine[i].arrayText.map((x) => {
                let desc;
                // Captura de devengos
                if (x.left >= leftEarns && x.left < leftDiscounts) {
                  /**
                   * Variable condicional, si el valor de Centro costo
                   * está situado en la columna devengo
                   */
                  let comprobarCentroEnDevengo = arrayTextLine[
                    i
                  ].arrayText[2]?.text.includes("$")
                    ? arrayTextLine[i].arrayText[2]?.text.split("$")[1].trim()
                    : "0";

                  /**
                   * Variable condicional, si hay valores de deduccion en los datos de
                   * devengos
                   */
                  let comprobarCamposDeDeduccion =
                    arrayTextLine[i].arrayText[2]?.left >= leftDiscounts
                      ? "0"
                      : arrayTextLine[i].arrayText[2]?.text;
                  // : comprobarDevengoEnCantidad;

                  /**
                   * Variable condicional, si el valor del devengo viene
                   * en la columna cantidad
                   */
                  let comprobarDevengoEnCantidad = arrayTextLine[
                    i
                  ].arrayText[2]?.text.includes("$")
                    ? "0"
                    : comprobarCamposDeDeduccion;
                  // : arrayTextLine[i].arrayText[2]?.text;

                  // Caso especial
                  let comprobarDevengoConDobleSigno;
                  if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                    comprobarDevengoConDobleSigno =
                      arrayTextLine[i].arrayText[3]?.text.split("$")[1] === " "
                        ? arrayTextLine[i].arrayText[3]?.text.split("$")[2].trim()
                        : arrayTextLine[i].arrayText[3]?.text.split("$")[1].trim();
                  }

                  /**
                   * Variable condicional, si el valor del devengo se encuentra
                   * en otras columnas
                   */
                  let verificarPosicionDevengo =
                    arrayTextLine[i].arrayText[3]?.left < leftCentroCosto
                      ? comprobarDevengoConDobleSigno
                      : comprobarCentroEnDevengo;

                  /**
                   * Variable condicional, si el valor del devengo viene
                   * en la columna descripcion
                   */
                  let comprobarDevengoEnDescripcion = arrayTextLine[
                    i
                  ].arrayText[1]?.text.includes("$")
                    ? "0"
                    : verificarPosicionDevengo;

                  /**
                   * Variable que pregunta si el codigo está junto a la descripcion en
                   * el bloque
                   */
                  desc = arrayTextLine[i].arrayText[0]?.text
                    .replace(/[\d]+/g, "")
                    .split(". ")[1];

                  let conceptoCodigo = "";
                  let descripcion = "";

                  // Si solo viene el codigo del concepto
                  if (!desc) {
                    conceptoCodigo = arrayTextLine[i].arrayText[0]?.text;
                    descripcion = arrayTextLine[i].arrayText[1]?.text;
                  } else {
                    conceptoCodigo = arrayTextLine[
                      i
                    ].arrayText[0]?.text.replace(/\D/g, "");
                    descripcion = arrayTextLine[i].arrayText[0]?.text
                      .replace(/[\d]+/g, "")
                      .split(". ")[1]
                      .trim();
                  }

                  elementDevengos = {
                    conceptoCodigo,
                    descripcion,
                    unidades:
                      arrayTextLine[i].arrayText[1]?.left >= leftCantidad
                        ? arrayTextLine[i].arrayText[1]?.text
                        : comprobarDevengoEnCantidad,
                    precio: "N/A",
                    devengo: comprobarDevengoEnDescripcion,
                    // arrayTextLine[i].arrayText[3]?.left < leftCentroCosto
                    //   ? comprobarDevengoConDobleSigno
                    //   : comprobarCentroEnDevengo,
                  };
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.devengos.confidence = (
                    contConfidence / totalDatos
                  ).toFixed(2);
                }

                // Captura de devengos
                if (x.left >= leftDiscounts) {
                  elementDescuentos = {
                    centroCosto: "",
                    conceptoDeduccion: "",
                    descripcionDeduccion: "",
                    deduccion: "",
                  };
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.devengos.confidence = (
                    contConfidence / totalDatos
                  ).toFixed(2);
                }
              });
              client.descuentos.list.push(elementDescuentos);
              client.devengos.list.push(elementDevengos);
            }

            // jsonClient
            arrayTextLine[i].arrayText.map((x) => {
              // List Devengos
              if (x.left >= leftEarns && x.left < leftDiscounts) {
                // console.log(x);
                // let { text } = x;
                // console.log(text);
                // elementDevengos={text}
                // console.log(arrayTextLine[i].arrayText[0]);
                // elementDevengos = {
                //   concep: x[0]?.text,
                //   desc: x[1]?.text,
                //   cant: x[2]?.text,
                //   deve: x[3]?.text,
                // };
                // console.log(x);
                // // Columna Concepto
                // if (arrayTextLine[i].arrayText[0]?.left >= x.left) {
                //   concepDevengo = x.text;
                // }
                // // Columna Descripcion concepto
                // if (arrayTextLine[i].arrayText[1]?.left >= x.left) {
                //   descripcionDevengo = x.text;
                // }
                // // Columna Cantidad
                // if (arrayTextLine[i].arrayText[2]?.left === x.left) {
                //   cantidadDevengo = x.text;
                // }
                // // Columna devengos
                // if (arrayTextLine[i].arrayText[2]?.left <= x.left) {
                //   devengo = x.text;
                // } else {
                //   devengo = 0;
                // }
                // elementDevengos = {
                //   concepDevengo,
                //   descripcionDevengo,
                //   cantidadDevengo:
                //     cantidadDevengo === "" ? 0 : comprobarDevengoEnCantidad,
                //   devengo,
                // };
                // contConfidence += x.confidence;
                // totalDatos++;
                // client.devengos.confidence = (
                //   contConfidence / totalDatos
                // ).toFixed(2);
              }

              // List deducciones
              if (x.left >= leftDiscounts) {
                contConfidence += x.confidence;
                totalDatos++;
                client.descuentos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
              }
            });

            // client.devengos.list.push(elementDevengos);
            //TODO: // client.descuentos.list.push(elementDescuentos);
          }

          // MUESTREO TEMPORAL
          console.log(client.devengos);
          // console.log(client.banco);
          // console.log(client.descuentos);

          // AÑADIENDO LOS RESULTADOS DE LOS OBJETOS
          resultObject = {
            client,
            company,
          };

          // arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(resultObject) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
