
const Express = require('express')
const bodyParser = require('body-parser');
const PDFWriter = require('./pdf/PDFWriter.js')
const pdfutils = require('./pdf/pdfutils.js')
const facturaTemplates = require('./pdf/templates.js')
const fs = require('fs')

const db = require('./dbAdmin.js')
const formatter = require('./responseFormatter.js')
const {
  validarCliente,
  validarMedico,
  validarProducto,
  validarVenta,
  validarVentaExamen,
 } = require('./sanitizationMiddleware.js')

const port = process.env.PORT || 8192
//crear directorio donde almacenar facturas en pdf.
const facturaDir = pdfutils.createTemporaryDir('facturas/')
const CONSTRAINT_ERROR_SQLITE = 19

const printError = (errorString) => {
  //don't print errors in tests. Tests should print errors from the response
  if(process.env.NODE_ENV !== 'test') console.error(errorString)
}

const app = Express()
app.use(bodyParser.json()); // for parsing application/json

app.post('/cliente/new', validarCliente, function (req, res) {
  const {
    ruc,
    nombre,
    direccion,
    email,
    telefono1,
    telefono2,
    descDefault,
  } = req.safeData

  db.insertarCliente(ruc, nombre, email, direccion, telefono1, telefono2, descDefault)
  .then(function () {//OK!
    res.status(200)
    .send('OK')
  }, function (err) {//ERROR!
    printError('db error: ' + err)
    res.status(422)
    .send(err)
  })
});

app.get('/cliente/find', function (req,res) {
  const q = req.query.q || ''
  db.findClientes(q)
  .then(function(clientes) {
    if(clientes.length === 0)
      res.status(404)
      .send('No existen clientes con esa cadena de caracteres')
    else
      res.status(200)
      .send(clientes)
  }, function (err) {//ERROR!
    res.status(500)
    .send(err)
  })

});


app.post('/medico/new', validarMedico, function (req, res) {
  const {
    nombre,
    direccion,
    email,
    comision,
    telefono1,
    telefono2,
  } = req.safeData

  db.insertarMedico(nombre, direccion, email, comision, telefono1, telefono2)
  .then(function () {//OK!
    res.status(200)
    .send('OK')
  }, function (err) {//ERROR!
    printError('db error: ' + err)
    res.status(422)
    .send(err)
  })

});

app.get('/medico/find', function (req,res) {
  const q = req.query.q || ''
  db.findMedicos(q)
  .then(function(medicos) {
    if(medicos.length === 0)
      res.status(404)
      .send('No existen clientes con esa cadena de caracteres')
    else
      res.status(200)
      .send(medicos)
  }, function (err) {//ERROR!
    res.status(500)
    .send(err)
  })

});

app.post('/producto/new', validarProducto, function (req, res) {
  const {
    codigo,
    nombre,
    marca,
    precioDist,
    precioVenta,
    pagaIva,
  } = req.safeData

  db.insertarProducto(codigo, nombre, marca, precioDist, precioVenta, pagaIva)
  .then(function(id) {
    res.status(200)
    .send(id)
  }, function (err) {//ERROR!
    printError('db error: ' + JSON.stringify(err))
    res.status(422)
    .send(err)
  })
})

app.get('/producto/find', function (req,res) {
  const q = req.query.q || ''
  db.findProductos(q)
  .then(function(productos) {
    if(productos.length === 0)
      res.status(404)
      .send('No existen productos con esa cadena de caracteres')
    else
      res.status(200)
      .send(productos)
  }, function (err) {//ERROR!
    res.status(500)
    .send(err)
  })

});

function verVenta(req, res, tipo) {
  const {
    codigo,
    empresa,
  } = req.params
  const facturaFileName = codigo + empresa + '.pdf'

  if (req.headers.accept === 'application/json') //send json
    db.getFacturaData(codigo, empresa, tipo)
      .then(function (resp) {//OK!!
        res.status(200)
        .send(formatter.verVenta(resp))
      }, function (error) { //ERROR!
        res.status(error.errorCode)
        .send(error.text)
      })
  else //send pdf
    db.getFacturaData(codigo, empresa, tipo)
      .then(function (resp) {//OK!!
        const {
          ventaRow,
          cliente,
        } = resp

        const pdfData = pdfutils.ventaRowToPDFData(ventaRow)
        const writeFunc = facturaTemplates.biocled(pdfData, cliente)
        return new PDFWriter(facturaDir + facturaFileName, writeFunc)
      }, function (error) { //ERROR!
        return Promise.reject(error)
      })
      .then(function () {
        fs.readFile(facturaDir + facturaFileName, function (err, data) {
          JSON.stringify(err)
          res.contentType("application/pdf")
          res.send(data)
        })
      }, function (error) {
        res.status(error.errorCode)
        .send(error.text)

      })
}

app.get('/venta/ver/:empresa/:codigo', function (req, res) {
  verVenta(req, res, 0)
})

app.get('/venta_ex/ver/:empresa/:codigo', function (req, res) {
  verVenta(req, res, 1)
})

function deleteVenta(req, res) {
  const {
    codigo,
    empresa,
  } = req.params
  db.deleteVenta(codigo, empresa)
  .then(function(deletions) {
    if (deletions === 0)
      res.status(404)
      .send(`Factura con codigo: ${codigo} y empresa: ${empresa} no encontrada}`)
    else
      res.status(200)
      .send('OK')
  }, function (err) {//ERROR!
    res.status(500)
    .send(err)
  })}

app.post('/venta/delete/:empresa/:codigo', function (req, res) {
  deleteVenta(req, res)
});

app.post('/venta_ex/delete/:empresa/:codigo', function (req, res) {
  deleteVenta(req, res)
});

function findVentas (req, res, tipo, all) {
  const q = req.query.q || ''
  const promise = all ? db.findAllVentas(q) : db.findVentas(q, tipo)
  promise.then(function(ventas) {
    if(ventas.length === 0)
      res.status(404)
      .send('No existen facturas con esa cadena de caracteres')
    else
      res.status(200)
      .send(formatter.findVentas(ventas))
  }, function (err) {//ERROR!
    res.status(500)
    .send(err)
  })
}

app.get('/venta/find', function (req, res) {
  findVentas(req, res, 0)
});

app.get('/venta_ex/find', function (req, res) {
  findVentas(req, res, 1)
});

app.get('/venta/findAll', function (req, res) {
  findVentas(req, res, null, true)
});

app.post('/venta/new', validarVenta, function (req, res) {
  const {
    codigo,
    cliente,
    empresa,
    fecha,
    autorizacion,
    formaPago,
    detallado,
    descuento,
    iva,
    flete,
    subtotal,
    unidades,

  } = req.safeData
  db.insertarVenta(codigo, empresa, cliente, fecha, autorizacion, formaPago,
    detallado, descuento, iva, flete, subtotal, unidades)
  .then(function () {  //OK!
    res.status(200)
    .send("OK")
  }, function (error) {//ERROR!
    if (error.errno === CONSTRAINT_ERROR_SQLITE)
      res.status(400)
        .send("Ya existe una factura con ese código.")
    else
      res.status(500)
        .send(error)
  })
})

app.post('/venta_ex/new', validarVentaExamen, function (req, res) {
  const {
    codigo,
    empresa,
    cliente,
    fecha,
    autorizacion,
    formaPago,
    subtotal,
    descuento,
    unidades,
    medico,
    paciente,

  } = req.safeData
  db.insertarVentaExamen(codigo, empresa, cliente, fecha, autorizacion, formaPago,
    descuento, subtotal, unidades, medico, paciente)
  .then(function () {  //OK!
    res.status(200)
    .send("OK")
  }, function (error) {//ERROR!
    if (error.errno === CONSTRAINT_ERROR_SQLITE)
      res.status(400)
        .send("Ya existe una factura con ese código.")
    else
      res.status(500)
        .send(error)
  })
})

app.post('/venta/update', validarVenta, function (req, res) {
  const {
    codigo,
    empresa,
    cliente,
    fecha,
    autorizacion,
    formaPago,
    detallado,
    descuento,
    iva,
    flete,
    subtotal,
    unidades,

  } = req.safeData

  db.updateVenta(codigo, empresa, cliente, fecha, autorizacion, formaPago,
    detallado, descuento, iva, flete, subtotal, unidades)
  .then(function () {  //OK!
    res.status(200)
    .send("OK")
  })
  .catch(function (error) {//ERROR!
    res.status(500)
    res.send(error)
  })
})

app.post('/venta_ex/update', validarVentaExamen, function (req, res) {
  const {
    codigo,
    empresa,
    cliente,
    fecha,
    autorizacion,
    formaPago,
    subtotal,
    descuento,
    unidades,
    medico,
    paciente,

  } = req.safeData
  db.updateVentaExamen(codigo, empresa, cliente, fecha, autorizacion, formaPago,
    descuento, subtotal, unidades, medico, paciente)
  .then(function () {  //OK!
    res.status(200)
    .send("OK")
  })
  .catch(function (error) {//ERROR!
    res.status(500)
    res.send(error)
  })
})

const server = app.listen(port, function () {
  //eslint-disable-next-line
  console.log('Application listening on  port ' + port);
});

module.exports = server
