var path = require("path");
// const fs = require("fs");
const { documentExtract } = require("../utils.js");

const readMultipleLines = (
  i,
  textValidation,
  textReceived,
  columnOrigen,
  columnValidation,
  array = []
) => {
  let saveData;
  if (
    array[i + 1]?.arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    saveData = textReceived.text.split(" ").slice(1).join(" ");
  } else if (
    array[i + 2]?.arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    saveData = textReceived.text
      .split(" ")
      .slice(1)
      .join(" ")
      .concat(" " + array[i + 1]?.arrayText[columnOrigen]?.text);
  } else if (
    array[i + 3]?.arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    if (
      textReceived.left === array[i + 1]?.arrayText[columnOrigen]?.left ||
      textReceived.left === array[i + 2]?.arrayText[columnOrigen]?.left
    ) {
      saveData = textReceived.text
        .split(" ")
        .slice(1)
        .join(" ")
        .concat(
          " " +
            array[i + 1]?.arrayText[columnOrigen]?.text +
            " " +
            array[i + 2]?.arrayText[columnOrigen]?.text
        );
    } else {
      saveData = textReceived.text.split(" ").slice(1).join(" ");
    }
  } else if (
    array[i + 4]?.arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    if (
      textReceived.left === array[i + 1]?.arrayText[columnOrigen]?.left ||
      textReceived.left === array[i + 2]?.arrayText[columnOrigen]?.left ||
      textReceived.left === array[i + 3]?.arrayText[columnOrigen]?.left
    ) {
      saveData = textReceived.text
        .split(" ")
        .slice(1)
        .join(" ")
        .concat(
          " " +
            array[i + 1]?.arrayText[columnOrigen]?.text +
            " " +
            array[i + 2]?.arrayText[columnOrigen]?.text +
            " " +
            array[i + 3]?.arrayText[columnOrigen]?.text
        );
    } else {
      saveData = textReceived.text.split(" ").slice(1).join(" ");
    }
  }

  return saveData;
};

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
      let contConfidence2 = 0;
      let totalDatos = 0;
      let totalDatos2 = 0;

      let client = {
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
        fechaIngreso: "NO REGISTRA",
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

      let company = {
        nit: "",
        name: "",
      };

      let client2 = {
        fechaIngreso: "NO REGISTRA",
        banco: {},
        devengos: {
          list: [],
        },
        deducciones: {
          list: [],
        },
      };

      let company2 = {};

      let arrayAux = [];

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
                // console.log(strTop);

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
                  arrayTextLine[pos]?.arrayText.push({
                    top: ":::" + strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      top: strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }

                // Guardando nominas para comparar si hay mas de 2 facturas
                // en 1 sola imagen
                if (block.Text.toUpperCase().includes("NOMINA")) {
                  arrayAux.push(block.Text);
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Lee 2 facturas con fechas distintas en un mismo documento
           */
          let dobleFactura = false;

          if (arrayAux.length === 2) {
            let nominaPrimeraFactura = arrayAux[0]?.split(" ").pop();
            let nominaSegundaFactura = arrayAux[1]?.split(" ").pop();
            if (nominaPrimeraFactura !== nominaSegundaFactura) {
              dobleFactura = true;
            }
          }

          /**
           * Referencias left de las columnas de la tabla
           */
          let leftBasic;
          let leftConceptoDevengo;

          /**
           * Referencias top de las columnas de la tabla
           */
          let topSueldo;

          /**
           * Posición inicial de tabla de dev/ded
           */
          let init = arrayTextLine
            .map((e) => {
              return e.arrayText[0]?.text;
            })
            .indexOf("DEVENGOS");

          console.log(init);
          /**
           * Posición final de tabla de dev/ded y campo
           * de subtotales devengos y deducciones
           */
          let end = arrayTextLine
            .map((e) => {
              return e.arrayText[0]?.text;
            })
            .indexOf("SUBTOTAL");

          console.log(end);

          // Referencias de inicio y fin de recorrido de la tabla para segunda factura
          // unica imagen
          let init2 = dobleFactura
            ? arrayTextLine
                .map((e) => {
                  if (e.arrayText[0]?.top > 0.5) {
                    return e.arrayText[0]?.text;
                  }
                })
                .indexOf("DEVENGOS")
            : 0;
          // console.log(init2);

          let end2 = dobleFactura
            ? arrayTextLine
                .map((e) => {
                  if (e.arrayText[0]?.top > 0.5) {
                    return e.arrayText[0]?.text;
                  }
                })
                .indexOf("SUBTOTAL")
            : 0;
          // console.log(end2);
          /**
           * Coordenadas top del documento
           */
          let top;

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
            // let columna = 0;

            arrayTextLine[i]?.arrayText.map((x) => {
              if (x.top.includes(":::")) {
                top = x.top.split(":::")[1];
              } else {
                top = x.top;
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              if (dobleFactura) {
                if (top < 0.5) {
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.confidence = (contConfidence / totalDatos).toFixed(2);
                }
                if (top > 0.5) {
                  contConfidence2 += x.confidence;
                  totalDatos2++;
                  client2.confidence = (contConfidence2 / totalDatos2).toFixed(
                    2
                  );
                }
              } else {
                contConfidence += x.confidence;
                totalDatos++;
                client.confidence = (contConfidence / totalDatos).toFixed(2);
              }

              // Guardando nombre de la compañía
              if (
                dobleFactura &&
                x.text.includes("COLOMBIA S.A") &&
                !x.text.includes("BANCO")
              ) {
                top < 0.5 && (company.name = x.text);
                top > 0.5 && (company2.name = x.text);
              } else if (
                x.text.includes("COLOMBIA S.A") &&
                !x.text.includes("BANCO")
              ) {
                company.name = x.text;
              }

              // Guardando nombre y documento del cliente
              if (dobleFactura && x.text.startsWith("COMPROBANTE DE PAGO")) {
                let document;
                let name;
                let companyNit;

                document = arrayTextLine[block]?.arrayText[2]?.text;
                name = arrayTextLine[block]?.arrayText[0]?.text;

                // Captura de nit ambas facturas
                arrayTextLine[i - 1]?.arrayText.map((nit) => {
                  if (
                    nit.text.includes("-") ||
                    nit.text.split(" ").pop().includes(".")
                  ) {
                    companyNit = nit.text.split(" ").pop();
                  } else {
                    companyNit = "NO REGISTRA";
                  }
                });

                if (top < 0.5) {
                  client.documentNumber = document;
                  client.name = name;
                  company.nit = companyNit;
                }

                if (top > 0.5) {
                  client2.documentNumber = document;
                  client2.name = name;
                  company2.nit = companyNit;
                }
              } else if (x.text.startsWith("COMPROBANTE DE PAGO")) {
                client.documentNumber =
                  arrayTextLine[block]?.arrayText[2]?.text;
                client.name = arrayTextLine[block]?.arrayText[0]?.text;

                // Captura de nit
                arrayTextLine[i - 1]?.arrayText.map((nit) => {
                  if (
                    nit.text.includes("-") ||
                    nit.text.split(" ").pop().includes(".")
                  ) {
                    company.nit = nit.text.split(" ").pop();
                  } else {
                    company.nit = "NO REGISTRA";
                  }
                });
              }

              // Guardando convenio
              if (
                (dobleFactura && x.text.toUpperCase().startsWith("CONVENIO")) ||
                x.text.toUpperCase().startsWith("CONVENIA")
              ) {
                let convenio = x.text.includes("-")
                  ? x.text.split("-")[1]?.trim()
                  : x.text.split(" ").slice(1).join(" ");

                top < 0.5 && (client.convenio = convenio);
                top > 0.5 && (client2.convenio = convenio);
              } else if (
                x.text.toUpperCase().startsWith("CONVENIO") ||
                x.text.toUpperCase().startsWith("CONVENIA")
              ) {
                client.convenio = x.text.includes("-")
                  ? x.text.split("-")[1]?.trim()
                  : x.text.split(" ").slice(1).join(" ");
              }

              // Guardando nomina
              if (dobleFactura && x.text.toUpperCase().startsWith("NOMINA")) {
                top < 0.5 && (client.nomina = x.text.split(" ").pop());
                top > 0.5 && (client2.nomina = x.text.split(" ").pop());
              } else if (x.text.toUpperCase().startsWith("NOMINA")) {
                client.nomina = x.text.split(" ").pop();
              }

              // Guardando pension
              if (
                dobleFactura &&
                (x.text.startsWith("PENSION") || x.text.startsWith("PENSIÓN"))
              ) {
                let save = readMultipleLines(
                  i,
                  "CUENTA",
                  x,
                  0,
                  1,
                  arrayTextLine
                );
                // Validando que tenga varias lineas la pension en la primera factura
                if (top < 0.5) {
                  client.pension = save;
                }
                // Validando que tenga varias lineas la pension en la segunda factura
                if (top > 0.5) {
                  client2.pension = save;
                }
              } else if (
                x.text.startsWith("PENSION") ||
                x.text.startsWith("PENSIÓN")
              ) {
                // Validando que tenga varias lineas la pension
                client.pension = readMultipleLines(
                  i,
                  "CUENTA",
                  x,
                  0,
                  1,
                  arrayTextLine
                );
              }

              // Guardando numero de cuenta
              if (dobleFactura && x.text.toUpperCase().startsWith("CUENTA")) {
                let numberAccount;
                if (x.text.includes(":") && x.text.split(":").length >= 2) {
                  numberAccount = x.text.split(":")[1]?.split(" ").join("");
                } else if (
                  !x.text.includes(":") &&
                  x.text.split(" ").length > 2
                ) {
                  numberAccount = x.text.split(" ").slice(1).join("");
                } else {
                  numberAccount = x.text.split(" ").pop();
                }
                top < 0.5 && (client.banco.account = numberAccount);
                top > 0.5 && (client2.banco.account = numberAccount);
              } else if (x.text.toUpperCase().startsWith("CUENTA")) {
                if (x.text.includes(":") && x.text.split(":").length >= 2) {
                  client.banco.account = x.text
                    .split(":")[1]
                    .split(" ")
                    .join("");
                } else if (
                  !x.text.includes(":") &&
                  x.text.split(" ").length > 2
                ) {
                  client.banco.account = x.text.split(" ").slice(1).join("");
                } else {
                  client.banco.account = x.text.split(" ").pop();
                }
              }

              // Guardando nombre del banco
              if (dobleFactura && x.text.toUpperCase().startsWith("BANCO")) {
                let save = readMultipleLines(
                  i,
                  "DEVENGOS",
                  x,
                  0,
                  0,
                  arrayTextLine
                );
                top < 0.5 && (client.banco.name = save);
                top > 0.5 && (client2.banco.name = save);
              } else if (x.text.toUpperCase().startsWith("BANCO")) {
                client.banco.name = readMultipleLines(
                  i,
                  "DEVENGOS",
                  x,
                  0,
                  0,
                  arrayTextLine
                );
              }

              // Guardando salario base
              if (dobleFactura && x.text.startsWith("BASICO")) {
                let basico;
                top < 0.5 && (client.basico = x.text.split(" ").pop());
                top > 0.5 && (client2.basico = x.text.split(" ").pop());
                leftBasic = (x.left - 0.03).toFixed(2);
              } else if (x.text.startsWith("BASICO")) {
                leftBasic = (x.left - 0.03).toFixed(2);
                if (x.text.split(" ").pop().includes("BASICO")) {
                  client.basico = arrayTextLine[i]?.arrayText[3]?.text.includes(
                    "CARGO"
                  )
                    ? "NO LEIBLE"
                    : arrayTextLine[i]?.arrayText[3]?.text;
                } else {
                  client.basico = x.text.split(" ").pop();
                }
              }

              // Guardando cargo
              if (dobleFactura && x.text.startsWith("CARGO")) {
                let cargo;
                if (x.text.includes(":")) {
                  cargo = x.text.split(":").slice(1).join(" ").trim();
                } else {
                  cargo = x.text.split(" ").slice(1).join(" ");
                }
                top < 0.5 && (client.cargo = cargo);
                top > 0.5 && (client2.cargo = cargo);
              } else if (x.text.startsWith("CARGO")) {
                client.cargo = x.text.includes(":")
                  ? x.text.split(":").slice(1).join(" ").trim()
                  : x.text.split(" ").slice(1).join(" ");
              }

              // Guardando salud
              if (dobleFactura && x.text.startsWith("SALUD")) {
                top < 0.5 &&
                  (client.salud = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.salud = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.startsWith("SALUD")) {
                client.salud = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando neto
              if (
                dobleFactura &&
                (x.text.includes("CVS") || x.text.startsWith("SON"))
              ) {
                // Primera Factura validando signo $
                leftConceptoDevengo = x.left;
                let lastBlock = arrayTextLine[i - 1]?.arrayText[0]?.text;
                let sueldo;

                if (lastBlock.includes("$")) {
                  if (lastBlock.includes(". .")) {
                    let temp = lastBlock.split("$")[1];
                    sueldo = temp.split(". .").join(".").trim();
                  } else {
                    sueldo = lastBlock.split("$")[1]?.trim();
                  }
                } else {
                  sueldo = lastBlock;
                }
                top < 0.5 && (client.sueldoNeto = sueldo);
                top > 0.5 && (client2.sueldoNeto = sueldo);
              }
              // Unica factura
              else if (x.text.includes("CVS") || x.text.startsWith("SON")) {
                leftConceptoDevengo = x.left;
                let lastBlock = arrayTextLine[i - 1]?.arrayText[0] || false;

                if (lastBlock.text.includes("SUBTOTAL")) {
                  client.sueldoNeto = (
                    client.devengos.subtotal - client.deducciones.subtotal
                  ).toString();
                } else if (lastBlock.text.includes("$")) {
                  if (lastBlock.text.includes(". .")) {
                    let temp = lastBlock.text.split("$")[1];
                    client.sueldoNeto = temp.split(". .").join(".").trim();
                  } else {
                    client.sueldoNeto = lastBlock.text.split("$")[1]?.trim();
                  }
                } else {
                  if (lastBlock.includes(". .")) {
                    client.sueldoNeto = lastBlock.text
                      .split(". .")
                      .join(".")
                      .trim();
                  } else {
                    client.sueldoNeto = lastBlock.text;
                  }
                }
              }

              // Guardando subtotales de devengos/deducciones
              if (dobleFactura && x.text.toUpperCase().includes("SUBTOTAL")) {
                let subDevengo;
                let subDeduccion;

                if (arrayTextLine[i]?.arrayText[1]?.text.includes("$")) {
                  subDevengo = arrayTextLine[i]?.arrayText[1]?.text
                    .split("$")[1]
                    ?.trim();
                } else {
                  subDevengo = arrayTextLine[i]?.arrayText[1]?.text;
                }
                if (arrayTextLine[i]?.arrayText[3]?.text.includes("$")) {
                  subDeduccion = arrayTextLine[i]?.arrayText[3]?.text
                    .split("$")[1]
                    ?.trim();
                } else {
                  subDeduccion = arrayTextLine[i]?.arrayText[3]?.text;
                }

                if (top < 0.5) {
                  // Captura de devengos primera factura
                  client.devengos.subtotal = subDevengo;
                  // Captura de deducciones primera factura
                  client.deducciones.subtotal = subDeduccion;
                }

                if (top > 0.5) {
                  // Captura de devengos primera factura
                  client2.devengos.subtotal = subDevengo;
                  // Captura de deducciones primera factura
                  client2.deducciones.subtotal = subDeduccion;
                }
              } else if (x.text.toUpperCase().includes("SUBTOTAL")) {
                // Ternario para guardar la referencia top del sueldo
                // si viene 3 bloques debajo
                let cvsRef3Bloque = arrayTextLine[
                  i + 3
                ]?.arrayText[0]?.text.includes("CVS")
                  ? arrayTextLine[i + 2]?.arrayText[0]?.top
                  : 0;

                // Ternario para guardar la referencia top del sueldo
                // si viene 2 bloques debajo
                let cvsRef2Bloque = arrayTextLine[
                  i + 2
                ]?.arrayText[0]?.text.includes("CVS")
                  ? arrayTextLine[i + 1]?.arrayText[0]?.top
                  : cvsRef3Bloque;

                // referencia top para almacenar subtotales
                topSueldo = arrayTextLine[i + 1]?.arrayText[0]?.text.includes(
                  "CVS"
                )
                  ? arrayTextLine[i]?.arrayText[0]?.top
                  : cvsRef2Bloque;

                // Si los valores de los subtotales vienen un bloque abajo
                let backBlockReference =
                  arrayTextLine[i + 1]?.arrayText[0] || false;

                // Captura de devengos unica factura
                if (arrayTextLine[i]?.arrayText[1]?.text.includes("$")) {
                  client.devengos.subtotal = arrayTextLine[
                    i
                  ]?.arrayText[1]?.text
                    .split("$")[1]
                    ?.trim();
                } else {
                  if (
                    arrayTextLine[i]?.arrayText[1]?.text.includes("SUBTOTAL")
                  ) {
                    client.devengos.subtotal = arrayTextLine[
                      i
                    ]?.arrayText[0]?.text
                      .split("$")[1]
                      ?.trim();
                  } else {
                    client.devengos.subtotal =
                      arrayTextLine[i]?.arrayText[1]?.text;
                  }
                }

                // Captura de deducciones unica factura
                if (arrayTextLine[i]?.arrayText[3]?.text.includes("$")) {
                  client.deducciones.subtotal = arrayTextLine[
                    i
                  ]?.arrayText[3]?.text
                    .split("$")[1]
                    ?.trim();
                } else {
                  client.deducciones.subtotal =
                    arrayTextLine[i]?.arrayText[3]?.text;
                }

                if (
                  (!client.deducciones.subtotal ||
                    client.deducciones.subtotal === "SUBTOTAL") &&
                  backBlockReference?.text.includes("$") &&
                  backBlockReference?.top < topSueldo
                ) {
                  client.deducciones.subtotal = backBlockReference.text
                    .split("$")[1]
                    ?.trim();
                }
              }
            });
          }

          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDeducciones = {};

          let elementDevengos2 = {};
          let elementDeducciones2 = {};
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

          // SI NO HAY DATOS EN LA TABLA
          if (init + 1 === end) {
            client.devengos.confidence = "0";
            client.deducciones.confidence = "0";
          }

          /**
           * Variable que guarda la posicion de la columna
           * donde se encuentra el basico, usada como referencia
           * para capturar datos de la tabla de deducciones
           */
          let indiceCodigoDeduccion;

          // Referencias left del encabezado de la tabla
          leftEarns = arrayTextLine[init]?.arrayText[0]?.left;
          let leftCantidadDevengo = arrayTextLine[init]?.arrayText[1]?.left;
          let leftValorDevengo = arrayTextLine[init]?.arrayText[2]?.left;
          leftDiscounts = arrayTextLine[init]?.arrayText[3]?.left;
          // let leftCantidadDedu = arrayTextLine[init]?.arrayText[4]?.left;
          let leftValorDeduccion = arrayTextLine[init]?.arrayText[5]?.left;

          // RECORRIDO DE TABLA
          for (let i = init + 1; i < end; i++) {
            let codeOnValue;
            // Captura de devengos
            if (arrayTextLine[i]?.arrayText[0]?.left < leftBasic) {
              arrayTextLine[i]?.arrayText.map((x) => {
                let desc;
                let conceptoCodigo;
                let concepto;
                let unidades;
                let devengo;
                if (x.left < leftBasic) {
                  // console.log(x);
                  // Ternario de devengo en el campo de cantidad
                  let valueOnAmount;

                  desc = arrayTextLine[i]?.arrayText[0]?.text
                    .replace(/[\d]+/g, "")
                    .split(" ")[1];

                  // Si viene concepto separado
                  if (!desc) {
                    let textOnCode = isNaN(
                      arrayTextLine[i]?.arrayText[0]?.text.replace(/[\d]+/g, "")
                    )
                      ? "No leible"
                      : arrayTextLine[i]?.arrayText[0]?.text;

                    valueOnAmount =
                      arrayTextLine[i]?.arrayText[2]?.left >=
                        leftValorDevengo &&
                      arrayTextLine[i]?.arrayText[2]?.left <= leftBasic
                        ? arrayTextLine[i]?.arrayText[2]?.text
                        : 0;

                    let amountOnConcept =
                      arrayTextLine[i]?.arrayText[1]?.left >=
                      leftCantidadDevengo
                        ? "No leible"
                        : arrayTextLine[i]?.arrayText[1]?.text;

                    let amountDif =
                      arrayTextLine[i]?.arrayText[1]?.left >=
                      leftCantidadDevengo
                        ? arrayTextLine[i]?.arrayText[1]?.text
                        : 0;

                    conceptoCodigo =
                      arrayTextLine[i]?.arrayText[0]?.left > leftEarns
                        ? 0
                        : textOnCode;

                    concepto =
                      arrayTextLine[i]?.arrayText[1]?.left ===
                        arrayTextLine[i + 1]?.arrayText[0]?.left &&
                      arrayTextLine[i + 1]?.arrayText[1] === undefined
                        ? arrayTextLine[i]?.arrayText[1]?.text.concat(
                            " " + arrayTextLine[i + 1]?.arrayText[0]?.text
                          )
                        : amountOnConcept;

                    unidades =
                      arrayTextLine[i]?.arrayText[2]?.left < leftValorDevengo
                        ? arrayTextLine[i]?.arrayText[2]?.text
                        : amountDif;

                    devengo =
                      arrayTextLine[i]?.arrayText[3]?.left <= leftBasic
                        ? arrayTextLine[i]?.arrayText[3]?.text
                        : valueOnAmount;
                  }
                  // Si viene el codigo junto al concepto
                  else {
                    valueOnAmount =
                      arrayTextLine[i]?.arrayText[1]?.left >=
                      leftCantidadDevengo
                        ? arrayTextLine[i]?.arrayText[1]?.text
                        : 0;

                    conceptoCodigo =
                      arrayTextLine[i]?.arrayText[0]?.left > leftEarns
                        ? 0
                        : arrayTextLine[i]?.arrayText[0]?.text.replace(
                            /\D/g,
                            ""
                          );

                    concepto =
                      arrayTextLine[i]?.arrayText[0]?.left ===
                        arrayTextLine[i + 1]?.arrayText[0]?.left &&
                      arrayTextLine[i + 1]?.arrayText[1] === undefined
                        ? arrayTextLine[i]?.arrayText[0]?.text
                            .replace(/[\d]+/g, "")
                            .concat(
                              " " + arrayTextLine[i + 1]?.arrayText[0]?.text
                            )
                        : arrayTextLine[i]?.arrayText[0]?.text
                            .replace(/[\d]+/g, "")
                            .trim();

                    unidades =
                      arrayTextLine[i]?.arrayText[1]?.left < leftValorDevengo
                        ? arrayTextLine[i]?.arrayText[1]?.text
                        : 0;

                    devengo =
                      arrayTextLine[i]?.arrayText[2]?.left < leftBasic
                        ? arrayTextLine[i]?.arrayText[2]?.text
                        : valueOnAmount;
                  }

                  // NOTA
                  // Si la lectura del valor de devengo viene incompleta
                  // se aproxima con un 0

                  // Si existe valores en millones (3 comas) combinados
                  if (devengo !== 0 && devengo.split(",")[3]) {
                    // console.log("entro 1");
                    if (devengo.split(",")[3]?.length === 2) {
                      devengo = devengo.concat("0");
                    } else if (devengo.split(",")[3]?.length === 6) {
                      let idx = devengo.indexOf(devengo.split(",")[3]) - 1;
                      codeOnValue = devengo.split(",")[3];
                      devengo = devengo.slice(0, idx);
                    } else if (devengo.split(",")[3]?.length > 3) {
                      codeOnValue = devengo.split(",")[3]?.slice(3);
                      let idx = devengo.indexOf(devengo.split(",")[3]) + 3;
                      devengo = devengo.slice(0, idx);
                    }
                  }
                  // Si el devengo lo toma en miles con . <- punto
                  else if (devengo !== 0 && devengo.split(".")[3]) {
                    // console.log("entro 1 .");
                    if (devengo.split(".")[3]?.length === 2) {
                      devengo = devengo.concat("0");
                    } else if (devengo.split(".")[3]?.length === 6) {
                      let idx = devengo.indexOf(devengo.split(".")[3]) - 1;
                      codeOnValue = devengo.split(".")[3];
                      devengo = devengo.slice(0, idx);
                    } else if (devengo.split(".")[3]?.length > 3) {
                      codeOnValue = devengo.split(".")[3]?.slice(3);
                      let idx = devengo.indexOf(devengo.split(".")[3]) + 3;
                      devengo = devengo.slice(0, idx);
                    }
                  }
                  // Si existe valores en millones (2 comas) combinados
                  else if (devengo !== 0 && devengo.split(",")[2]) {
                    // console.log("entro 2");
                    if (devengo.split(",")[2]?.length === 2) {
                      devengo = devengo.concat("0");
                    } else if (devengo.split(",")[2]?.length === 6) {
                      let idx = devengo.indexOf(devengo.split(",")[2]) - 1;
                      codeOnValue = devengo.split(",")[2];
                      devengo = devengo.slice(0, idx);
                    } else if (devengo.split(",")[2]?.length > 3) {
                      codeOnValue = devengo.split(",")[2]?.slice(3);
                      let idx = devengo.indexOf(devengo.split(",")[2]) + 3;
                      devengo = devengo.slice(0, idx);
                    }
                  } else if (devengo !== 0 && devengo.split(".")[2]) {
                    // console.log("entro 2 .");
                    if (devengo.split(".")[2]?.length === 2) {
                      devengo = devengo.concat("0");
                    } else if (devengo.split(".")[2]?.length === 6) {
                      let idx = devengo.indexOf(devengo.split(".")[2]) - 1;
                      codeOnValue = devengo.split(".")[2];
                      devengo = devengo.slice(0, idx);
                    } else if (devengo.split(".")[2]?.length > 3) {
                      codeOnValue = devengo.split(".")[2]?.slice(3);
                      let indexValue =
                        devengo.indexOf(devengo.split(".")[2]) + 3;
                      devengo = devengo.slice(0, indexValue);
                    }
                  }
                  // Si existe valores en miles (1 coma) combinados
                  else if (devengo !== 0 && devengo.split(",")[1]) {
                    // console.log("entro 3");
                    if (devengo.split(",")[1]?.length === 2) {
                      devengo = devengo.concat("0");
                    } else if (devengo.split(",")[1]?.length > 3) {
                      codeOnValue = devengo.split(",")[1]?.slice(3);
                      let indexValue = devengo.indexOf(",") + 4;
                      devengo = devengo.slice(0, indexValue);
                    }
                  } else if (devengo !== 0 && devengo.split(".")[1]) {
                    // console.log("entro 3 .");
                    if (devengo.split(".")[1]?.length === 2) {
                      devengo = devengo.concat("0");
                    } else if (devengo.split(".")[1]?.length > 3) {
                      codeOnValue = devengo.split(".")[1]?.slice(3);
                      let indexValue = devengo.indexOf(".") + 4;
                      devengo = devengo.slice(0, indexValue);
                    }
                  }

                  elementDevengos = {
                    conceptoCodigo,
                    concepto,
                    unidades,
                    precio: "N/A",
                    devengo,
                  };
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.devengos.confidence = (
                    contConfidence / totalDatos
                  ).toFixed(2);
                }
              });

              if (
                !(
                  arrayTextLine[i]?.arrayText[0]?.left >= leftConceptoDevengo &&
                  arrayTextLine[i]?.arrayText[0]?.left < leftCantidadDevengo
                )
              ) {
                client.devengos.list.push(elementDevengos);
              }
            }

            // -----------------------------------------------------------------
            // Lectura de deducciones
            arrayTextLine[i]?.arrayText.map((x) => {
              // Confirmacion de si existe en el devengo el codigo pegado a su
              // descripcion
              let descDevengo = arrayTextLine[i]?.arrayText[0]?.text
                .replace(/[\d]+/g, "")
                .split(" ")[1];

              if (x.left > leftBasic && x.left < leftDiscounts) {
                indiceCodigoDeduccion = arrayTextLine[i]?.arrayText.findIndex(
                  (center) => {
                    return x === center;
                  }
                );
              } else if (codeOnValue) {
                if (
                  (descDevengo &&
                    arrayTextLine[i]?.arrayText[1]?.left >=
                      leftCantidadDevengo) ||
                  (!descDevengo &&
                    arrayTextLine[i]?.arrayText[2]?.left >= leftValorDevengo)
                ) {
                  indiceCodigoDeduccion = 3;
                } else if (
                  descDevengo &&
                  arrayTextLine[i]?.arrayText[1]?.left >= leftValorDevengo
                ) {
                  indiceCodigoDeduccion = 2;
                } else if (
                  !descDevengo &&
                  arrayTextLine[i]?.arrayText[2]?.left >= leftCantidadDevengo
                ) {
                  indiceCodigoDeduccion = 4;
                }
              }

              // Calculo confidence
              if (x.left > leftBasic) {
                contConfidence += x.confidence;
                totalDatos++;
                client.deducciones.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
              }
            });

            if (arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]) {
              if (
                arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]?.left >=
                leftBasic
              ) {
                let concepto;
                let conceptoCodigo;
                let unidades;

                // Validando si el texto del concepto es demasiado largo y si viene
                // combinado con una linea en devengos
                let concepValidation =
                  arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                    ?.left === arrayTextLine[i + 1]?.arrayText[1]?.left &&
                  arrayTextLine[i + 1]?.arrayText[0]?.left < leftBasic
                    ? arrayTextLine[i]?.arrayText[
                        indiceCodigoDeduccion + 1
                      ]?.text.concat(
                        " " + arrayTextLine[i + 1]?.arrayText[1]?.text
                      )
                    : arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                        ?.text;

                if (codeOnValue) {
                  conceptoCodigo = codeOnValue;

                  concepto =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]?.text;

                  unidades =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                      ?.left >= leftValorDeduccion
                      ? 0
                      : arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                          ?.text;
                } else {
                  concepto =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                      ?.left === arrayTextLine[i + 1]?.arrayText[0]?.left
                      ? arrayTextLine[i]?.arrayText[
                          indiceCodigoDeduccion + 1
                        ]?.text.concat(
                          " " + arrayTextLine[i + 1]?.arrayText[0]?.text
                        )
                      : concepValidation;

                  conceptoCodigo =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]?.text;

                  unidades =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                      ?.left < leftValorDeduccion
                      ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                          ?.text
                      : 0;
                }

                if (conceptoCodigo.startsWith("p")) {
                  conceptoCodigo = "0" + conceptoCodigo.slice(1);
                }

                let deduccionOnDesc =
                  arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                    ?.left >= leftValorDeduccion
                    ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                        ?.text
                    : 0;

                let deduccionOnAmount =
                  arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                    ?.left >= leftValorDeduccion
                    ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                        ?.text
                    : deduccionOnDesc;

                let deduccion =
                  arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 3]
                    ?.left >= leftValorDeduccion
                    ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 3]
                        ?.text
                    : deduccionOnAmount;

                elementDeducciones = {
                  conceptoCodigo,
                  concepto,
                  unidades,
                  precio: "N/A",
                  deduccion,
                };

                client.deducciones.list.push(elementDeducciones);
              }
            }
          }

          if (dobleFactura) {
            for (let i = init2 + 1; i < end2; i++) {
              let codeOnValue;
              // Captura de devengos
              if (arrayTextLine[i]?.arrayText[0]?.left < leftBasic) {
                arrayTextLine[i]?.arrayText.map((x) => {
                  let desc;
                  let conceptoCodigo;
                  let concepto;
                  let unidades;
                  let devengo;
                  if (x.left < leftBasic) {
                    // Ternario de devengo en el campo de cantidad
                    let valueOnAmount;

                    desc = arrayTextLine[i]?.arrayText[0]?.text
                      .replace(/[\d]+/g, "")
                      .split(" ")[1];

                    // Si viene concepto separado
                    if (!desc) {
                      let textOnCode = isNaN(
                        arrayTextLine[i]?.arrayText[0]?.text.replace(
                          /[\d]+/g,
                          ""
                        )
                      )
                        ? "No leible"
                        : arrayTextLine[i]?.arrayText[0]?.text;

                      valueOnAmount =
                        arrayTextLine[i]?.arrayText[2]?.left >=
                          leftValorDevengo &&
                        arrayTextLine[i]?.arrayText[2]?.left <= leftBasic
                          ? arrayTextLine[i]?.arrayText[2]?.text
                          : 0;

                      let amountOnConcept =
                        arrayTextLine[i]?.arrayText[1]?.left >=
                        leftCantidadDevengo
                          ? "No leible"
                          : arrayTextLine[i]?.arrayText[1]?.text;

                      let amountDif =
                        arrayTextLine[i]?.arrayText[1]?.left >=
                        leftCantidadDevengo
                          ? arrayTextLine[i]?.arrayText[1]?.text
                          : 0;

                      conceptoCodigo =
                        arrayTextLine[i]?.arrayText[0]?.left > leftEarns
                          ? 0
                          : textOnCode;

                      concepto =
                        arrayTextLine[i]?.arrayText[1]?.left ===
                          arrayTextLine[i + 1]?.arrayText[0]?.left &&
                        arrayTextLine[i + 1]?.arrayText[1] === undefined
                          ? arrayTextLine[i]?.arrayText[1]?.text.concat(
                              " " + arrayTextLine[i + 1]?.arrayText[0]?.text
                            )
                          : amountOnConcept;

                      unidades =
                        arrayTextLine[i]?.arrayText[2]?.left < leftValorDevengo
                          ? arrayTextLine[i]?.arrayText[2]?.text
                          : amountDif;

                      devengo =
                        arrayTextLine[i]?.arrayText[3]?.left <= leftBasic
                          ? arrayTextLine[i]?.arrayText[3]?.text
                          : valueOnAmount;
                    }
                    // Si viene el codigo junto al concepto
                    else {
                      valueOnAmount =
                        arrayTextLine[i]?.arrayText[1]?.left >=
                        leftCantidadDevengo
                          ? arrayTextLine[i]?.arrayText[1]?.text
                          : 0;

                      conceptoCodigo =
                        arrayTextLine[i]?.arrayText[0]?.left > leftEarns
                          ? 0
                          : arrayTextLine[i]?.arrayText[0]?.text.replace(
                              /\D/g,
                              ""
                            );

                      concepto =
                        arrayTextLine[i]?.arrayText[0]?.left ===
                          arrayTextLine[i + 1]?.arrayText[0]?.left &&
                        arrayTextLine[i + 1]?.arrayText[1] === undefined
                          ? arrayTextLine[i]?.arrayText[0]?.text
                              .replace(/[\d]+/g, "")
                              .concat(
                                " " + arrayTextLine[i + 1]?.arrayText[0]?.text
                              )
                          : arrayTextLine[i]?.arrayText[0]?.text
                              .replace(/[\d]+/g, "")
                              .trim();

                      unidades =
                        arrayTextLine[i]?.arrayText[1]?.left < leftValorDevengo
                          ? arrayTextLine[i]?.arrayText[1]?.text
                          : 0;

                      devengo =
                        arrayTextLine[i]?.arrayText[2]?.left < leftBasic
                          ? arrayTextLine[i]?.arrayText[2]?.text
                          : valueOnAmount;
                    }

                    // NOTA
                    // Si la lectura del valor de devengo viene incompleta
                    // se aproxima con un 0

                    // Si existe valores en millones (3 comas) combinados
                    if (devengo !== 0 && devengo.split(",")[3]) {
                      if (devengo.split(",")[3]?.length === 2) {
                        devengo = devengo.concat("0");
                      } else if (devengo.split(",")[3]?.length === 6) {
                        let idx = devengo.indexOf(devengo.split(",")[3]) - 1;
                        codeOnValue = devengo.split(",")[3];
                        devengo = devengo.slice(0, idx);
                      } else if (devengo.split(",")[3]?.length > 3) {
                        codeOnValue = devengo.split(",")[3]?.slice(3);
                        let idx = devengo.indexOf(devengo.split(",")[3]) + 3;
                        devengo = devengo.slice(0, idx);
                      }
                    }
                    // Si el devengo lo toma en miles con . <- punto
                    else if (devengo !== 0 && devengo.split(".")[3]) {
                      if (devengo.split(".")[3]?.length === 2) {
                        devengo = devengo.concat("0");
                      } else if (devengo.split(".")[3]?.length === 6) {
                        let idx = devengo.indexOf(devengo.split(".")[3]) - 1;
                        codeOnValue = devengo.split(".")[3];
                        devengo = devengo.slice(0, idx);
                      } else if (devengo.split(".")[3]?.length > 3) {
                        codeOnValue = devengo.split(".")[3]?.slice(3);
                        let idx = devengo.indexOf(devengo.split(".")[3]) + 3;
                        devengo = devengo.slice(0, idx);
                      }
                    }
                    // Si existe valores en millones (2 comas) combinados
                    else if (devengo !== 0 && devengo.split(",")[2]) {
                      if (devengo.split(",")[2]?.length === 2) {
                        devengo = devengo.concat("0");
                      } else if (devengo.split(",")[2]?.length === 6) {
                        let idx = devengo.indexOf(devengo.split(",")[2]) - 1;
                        codeOnValue = devengo.split(",")[2];
                        devengo = devengo.slice(0, idx);
                      } else if (devengo.split(",")[2]?.length > 3) {
                        codeOnValue = devengo.split(",")[2]?.slice(3);
                        let idx = devengo.indexOf(devengo.split(",")[2]) + 3;
                        devengo = devengo.slice(0, idx);
                      }
                    } else if (devengo !== 0 && devengo.split(".")[2]) {
                      if (devengo.split(".")[2]?.length === 2) {
                        devengo = devengo.concat("0");
                      } else if (devengo.split(".")[2]?.length === 6) {
                        let idx = devengo.indexOf(devengo.split(".")[2]) - 1;
                        codeOnValue = devengo.split(".")[2];
                        devengo = devengo.slice(0, idx);
                      } else if (devengo.split(".")[2]?.length > 3) {
                        codeOnValue = devengo.split(".")[2]?.slice(3);
                        let indexValue =
                          devengo.indexOf(devengo.split(".")[2]) + 3;
                        devengo = devengo.slice(0, indexValue);
                      }
                    }
                    // Si existe valores en miles (1 coma) combinados
                    else if (devengo !== 0 && devengo.split(",")[1]) {
                      if (devengo.split(",")[1]?.length === 2) {
                        devengo = devengo.concat("0");
                      } else if (devengo.split(",")[1]?.length > 3) {
                        codeOnValue = devengo.split(",")[1]?.slice(3);
                        let indexValue = devengo.indexOf(",") + 4;
                        devengo = devengo.slice(0, indexValue);
                      }
                    } else if (devengo !== 0 && devengo.split(".")[1]) {
                      if (devengo.split(".")[1]?.length === 2) {
                        devengo = devengo.concat("0");
                      } else if (devengo.split(".")[1]?.length > 3) {
                        codeOnValue = devengo.split(".")[1]?.slice(3);
                        let indexValue = devengo.indexOf(".") + 4;
                        devengo = devengo.slice(0, indexValue);
                      }
                    }

                    elementDevengos2 = {
                      conceptoCodigo,
                      concepto,
                      unidades,
                      precio: "N/A",
                      devengo,
                    };
                    contConfidence += x.confidence;
                    totalDatos++;
                    client2.devengos.confidence = (
                      contConfidence / totalDatos
                    ).toFixed(2);
                  }
                });

                if (
                  !(
                    arrayTextLine[i]?.arrayText[0]?.left >=
                      leftConceptoDevengo &&
                    arrayTextLine[i]?.arrayText[0]?.left < leftCantidadDevengo
                  )
                ) {
                  client2.devengos.list.push(elementDevengos2);
                }
              }
              // -----------------------------------------------------------------
              // Lectura de deducciones
              arrayTextLine[i]?.arrayText.map((x) => {
                console.log(x);
                // Confirmacion de si existe en el devengo el codigo pegado a su
                // descripcion
                let descDevengo = arrayTextLine[i]?.arrayText[0]?.text
                  .replace(/[\d]+/g, "")
                  .split(" ")[1];

                if (x.left > leftBasic && x.left < leftDiscounts) {
                  indiceCodigoDeduccion = arrayTextLine[i]?.arrayText.findIndex(
                    (center) => {
                      return x === center;
                    }
                  );
                } else if (codeOnValue) {
                  if (
                    (descDevengo &&
                      arrayTextLine[i]?.arrayText[1]?.left >=
                        leftCantidadDevengo) ||
                    (!descDevengo &&
                      arrayTextLine[i]?.arrayText[2]?.left >= leftValorDevengo)
                  ) {
                    indiceCodigoDeduccion = 3;
                  } else if (
                    descDevengo &&
                    arrayTextLine[i]?.arrayText[1]?.left >= leftValorDevengo
                  ) {
                    indiceCodigoDeduccion = 2;
                  } else if (
                    !descDevengo &&
                    arrayTextLine[i]?.arrayText[2]?.left >= leftCantidadDevengo
                  ) {
                    indiceCodigoDeduccion = 4;
                  }
                }

                // Calculo confidence
                if (x.left > leftBasic) {
                  contConfidence += x.confidence;
                  totalDatos++;
                  client2.deducciones.confidence = (
                    contConfidence / totalDatos
                  ).toFixed(2);
                }
              });

              // console.log("value " + indiceCodigoDeduccion);
              if (arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]) {
                if (
                  arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]?.left >=
                  leftBasic
                ) {
                  let concepto;
                  let conceptoCodigo;
                  let unidades;

                  // Validando si el texto del concepto es demasiado largo y si viene
                  // combinado con una linea en devengos
                  let concepValidation =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                      ?.left === arrayTextLine[i + 1]?.arrayText[1]?.left &&
                    arrayTextLine[i + 1]?.arrayText[0]?.left < leftBasic
                      ? arrayTextLine[i]?.arrayText[
                          indiceCodigoDeduccion + 1
                        ]?.text.concat(
                          " " + arrayTextLine[i + 1]?.arrayText[1]?.text
                        )
                      : arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                          ?.text;

                  if (codeOnValue) {
                    conceptoCodigo = codeOnValue;

                    concepto =
                      arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]?.text;

                    unidades =
                      arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                        ?.left >= leftValorDeduccion
                        ? 0
                        : arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                            ?.text;
                  } else {
                    concepto =
                      arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                        ?.left === arrayTextLine[i + 1]?.arrayText[0]?.left
                        ? arrayTextLine[i]?.arrayText[
                            indiceCodigoDeduccion + 1
                          ]?.text.concat(
                            " " + arrayTextLine[i + 1]?.arrayText[0]?.text
                          )
                        : concepValidation;

                    conceptoCodigo =
                      arrayTextLine[i]?.arrayText[indiceCodigoDeduccion]?.text;

                    unidades =
                      arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                        ?.left < leftValorDeduccion
                        ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                            ?.text
                        : 0;
                  }

                  if (conceptoCodigo.startsWith("p")) {
                    conceptoCodigo = "0" + conceptoCodigo.slice(1);
                  }

                  let deduccionOnDesc =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                      ?.left >= leftValorDeduccion
                      ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 1]
                          ?.text
                      : 0;

                  let deduccionOnAmount =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                      ?.left >= leftValorDeduccion
                      ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 2]
                          ?.text
                      : deduccionOnDesc;

                  let deduccion =
                    arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 3]
                      ?.left >= leftValorDeduccion
                      ? arrayTextLine[i]?.arrayText[indiceCodigoDeduccion + 3]
                          ?.text
                      : deduccionOnAmount;

                  elementDeducciones2 = {
                    conceptoCodigo,
                    concepto,
                    unidades,
                    precio: "N/A",
                    deduccion,
                  };

                  client2.deducciones.list.push(elementDeducciones2);
                }
              }
            }
          }

          // MUESTREO TEMPORAL
          console.log(":::::::::::::::::::DEVENGOS 1:::::::::::::::::::");
          console.log(client.devengos);
          console.log(":::::::::::::::::::DEDUCCIONES 1:::::::::::::::::::");
          console.log(client.deducciones);

          // console.log(":::::::::::::::::::DEVENGOS 2:::::::::::::::::::");
          // console.log(client2.devengos);
          // console.log(":::::::::::::::::::DEDUCCIONES 2:::::::::::::::::::");
          // console.log(client2.deducciones);

          if (dobleFactura) {
            resultObject = { client, company, client2, company2 };
          } else {
            resultObject = { client, company };
          }

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
