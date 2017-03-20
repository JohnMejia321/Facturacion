const knex = require('./db.js')
const empresaExamenes = 'TECOGRAM'

const colocarVentaID = (unidades, codigo, empresa) => {
  const len = unidades.length
  for (let i = 0; i < len; i++) {
    unidades[i].codigoVenta = codigo
    unidades[i].empresaVenta = empresa
  }
}

const insertarVentaBase = (builder, codigo, empresa, cliente, fecha, autorizacion,
  formaPago, detallado, tipo, descuento, iva, flete, subtotal) => {
  return builder.table('ventas').insert({
    codigo: codigo,
    empresa: empresa,
    cliente: cliente,
    fecha: fecha,
    autorizacion: autorizacion,
    formaPago: formaPago,
    detallado: detallado,
    tipo: tipo,
    descuento: descuento,
    iva: iva,
    flete: flete,
    subtotal: subtotal,
  })
}

const updateVenta = (builder, codigo, empresa, cliente, fecha, autorizacion,
    formaPago, detallado, descuento, iva, flete, subtotal) => {
  return builder('ventas')
    .where({codigo, empresa}).update({
      cliente: cliente,
      fecha: fecha,
      autorizacion: autorizacion,
      formaPago: formaPago,
      descuento: descuento,
      iva: iva,
      subtotal: subtotal,
    })
}

const updateVentaExamen = (builder, codigo, cliente, fecha, autorizacion, formaPago,
    descuento, subtotal) => {
  return updateVenta(builder, codigo, empresaExamenes, cliente, fecha, autorizacion,
    formaPago, descuento, 0, 0, subtotal)
}

const updateExamenInfo = (builder, medico, paciente, codigo) => {
  return builder('examen_info')
    .where({codigoVenta: codigo, empresaVenta: empresaExamenes}).update({
      medico_id: medico,
      paciente: paciente,
    })
}

const getExamenInfo = (codigo) => {
  return knex.select('*')
    .from('examen_info')
    .where({codigoVenta: codigo})
}

const deleteVenta = (codigo, empresa, tipo) => {
  if (tipo !== 0) empresa = empresaExamenes
  return knex('ventas')
    .where({codigo, empresa})
    .del()
}

const deleteUnidadesVenta = (builder, codigo, empresa) => {
  return builder('unidades')
    .where({ codigoVenta: codigo, empresaVenta: empresa})
    .del()
}

const insertarNuevasUnidades = (builder, listaDeUnidades) => {
  return builder.table('unidades').insert(listaDeUnidades)
}

const insertarExamenInfo = (builder, medico, paciente, codigo) => {
  return builder.table('examen_info').insert({
    medico_id: medico,
    paciente: paciente,
    codigoVenta: codigo,
    empresaVenta: empresaExamenes,
  })
}

const getVenta = (codigo, empresa) => {
  return knex.select('*')
  .from('ventas')
  .where({codigo: codigo, empresa: empresa, tipo: 0})
}

const getVentaExamen = (codigo) => {
  return knex.select('*')
  .from('ventas')
  .where({empresa: empresaExamenes, codigo: codigo, tipo: 1})
}

const findVentas = (nombreCliente) => {
  return knex.select('codigo', 'empresa', 'fecha', 'ruc', 'nombre', 'iva',
    'descuento', 'autorizacion', 'flete', 'detallado', 'subtotal')
    .from('ventas')
    .join('clientes', {'ventas.cliente' : 'clientes.ruc' })
    .where('nombre', 'like', `%${nombreCliente}%`)
    .where('tipo', 0)
    .orderBy('fecha', 'desc')
    .limit(20)
}

const findVentasExamen = (nombre) => {
  return knex.select('codigo', 'fecha', 'ruc', 'nombre', 'subtotal',
    'descuento', 'iva', 'paciente', 'medico_id')
    .from('ventas')
    .join('clientes', {'ventas.cliente' : 'clientes.ruc' })
    .join('examen_info', {
      'ventas.codigo' : 'examen_info.codigoVenta',
      'ventas.empresa' : 'examen_info.empresaVenta',
    })
    .where('nombre', 'like', `%${nombre}%`)
    .orWhere('paciente', 'like', `%${nombre}%`)
    .where('tipo', 1)
    .orderBy('fecha', 'desc')
    .limit(20)
}

const getCliente = (ruc) => {
  return knex.select('*')
  .from('clientes')
  .where('ruc', ruc)
}

const getFacturablesVenta = (codigo, empresa) => {
  return knex.select('productos.nombre', 'unidades.producto', 'unidades.count',
  'unidades.precioVenta', 'productos.codigo', 'productos.pagaIva',
  'unidades.lote', 'unidades.fechaExp')
  .from('unidades')
  .join('productos', {'unidades.producto' : 'productos.rowid' })
  .where({codigoVenta: codigo, empresaVenta: empresa})
}

const getFacturablesVentaExamen = (codigo) => {
  return getFacturablesVenta(codigo, empresaExamenes)
}

const getVentaPorTipo = (codigo, empresa, tipo) => {
  switch (tipo) {
    case 0:
      return getVenta(codigo, empresa)
    case 1:
      return getVentaExamen(codigo)
    default:
      throw Error('Tipo de venta desconocido')
  }
}

const getFacturaData = (codigo, empresa, tipo) => {
  let ventaRow, cliente;
  if (tipo !== 0) empresa = empresaExamenes
  const p = getVentaPorTipo(codigo, empresa, tipo)
  .then((ventas) => {
    if (ventas.length > 0) {
      ventaRow = ventas[0]
      return getCliente(ventaRow.cliente)
    } else {
      return Promise.reject({errorCode: 404, text:"factura no encontrada"})
    }
  })
  .then((clientes) => {
    if (clientes.length > 0) {
      cliente = clientes[0]
      return getFacturablesVenta(codigo, empresa)
    } else {
      return Promise.reject({errorCode: 404, text: "cliente no encontrado"})
    }
  })

  if (tipo === 0)
    return p.then ((facturables) => {
      ventaRow.facturables = facturables
      return Promise.resolve({ventaRow: ventaRow, cliente: cliente})
    })
  else
    return p.then((facturables) => {
      ventaRow.facturables = facturables
      return getExamenInfo(codigo)
    })
    .then((rows) => {
      if (rows.length > 0) {
        const exInfo = rows[0]
        ventaRow.medico = exInfo.medico_id
        ventaRow.paciente = exInfo.paciente
        return Promise.resolve({ventaRow: ventaRow, cliente: cliente})
      } else {
        return Promise.reject({errorCode: 404, text: 'examen no encontrado'})
      }
    })
}

module.exports = {
  close: () => { knex.destroy() },
  insertarProducto: (codigo, nombre, precioDist, precioVenta, pagaIva) => {
    return knex.table('productos').insert({
      codigo: codigo,
      nombre: nombre,
      precioDist: precioDist,
      precioVenta: precioVenta,
      pagaIva: pagaIva,
    })
  },

  findProductos: (queryString) => {
    const queries = queryString.split(' ')
    const queryObject = knex.select('*')
      .from('productos')
      .where('nombre', 'like', `%${queries[0]}%`)

    for(let i = 1; i < queries.length; i++)
      queryObject.orWhere('nombre', 'like', `%${queries[i]}%`)

    return queryObject.limit(5)
  },

  insertarCliente: (ruc, nombre, direccion, email, telefono1, telefono2, descDefault) => {
    return knex.table('clientes').insert({
      ruc: ruc,
      nombre: nombre,
      direccion: direccion,
      email: email,
      telefono1: telefono1,
      telefono2: telefono2,
      descDefault: descDefault,
    })
  },

  findClientes: (queryString) => {
    const queries = queryString.split(' ')
    const queryObject = knex.select('*')
      .from('clientes')
      .where('nombre', 'like', `%${queries[0]}%`)

    for(let i = 1; i < queries.length; i++)
      queryObject.orWhere('nombre', 'like', `%${queries[i]}%`)

    return queryObject.limit(5)
  },

  insertarMedico: (nombre, direccion, email, comision, telefono1, telefono2) => {
    return knex.table('medicos').insert({
      nombre: nombre,
      direccion: direccion,
      email: email,
      comision: comision,
      telefono1: telefono1,
      telefono2: telefono2,
    })
  },

  findMedicos: (queryString) => {
    const queries = queryString.split(' ')
    const queryObject = knex.select('*')
      .from('medicos')
      .where('nombre', 'like', `%${queries[0]}%`)

    for(let i = 1; i < queries.length; i++)
      queryObject.orWhere('nombre', 'like', `%${queries[i]}%`)

    return queryObject.limit(5)
  },

  insertarVenta: (codigo, empresa, cliente, fecha, autorizacion, formaPago,
    detallado, descuento, iva, flete, subtotal, unidades) => {
    return knex.transaction ((trx) => {
      return insertarVentaBase(trx, codigo, empresa, cliente, fecha, autorizacion,
        formaPago, detallado, 0, descuento, iva, flete, subtotal)
      .then(() => {
        colocarVentaID(unidades, codigo, empresa)
        return insertarNuevasUnidades(trx, unidades)
      }, (err) => {
        return Promise.reject(err)
      })
    })
  },

  insertarVentaExamen: (codigo, cliente, fecha, autorizacion, formaPago,
    descuento, subtotal, unidades, medico, paciente) => {
    return knex.transaction ((trx) => {
      return insertarVentaBase(trx, codigo, empresaExamenes, cliente, fecha,
        autorizacion, formaPago, false, 1, descuento, 0, 0, subtotal)
      .then(() => {
        return insertarExamenInfo(trx, medico, paciente, codigo)
      })
      .then(() => {
        colocarVentaID(unidades, codigo, empresaExamenes)
        return insertarNuevasUnidades(trx, unidades)
      })
    })
  },


  updateVenta: (codigo, empresa, cliente, fecha, autorizacion, formaPago,
    detallado, descuento, iva, flete, subtotal, unidades) => {
    return knex.transaction ((trx) => {
      return updateVenta(trx, codigo, empresa, cliente, fecha, autorizacion,
        formaPago, detallado, descuento, iva, flete, subtotal)
      .then(() => {
        return deleteUnidadesVenta(trx, codigo, empresa)
      })
      .then(() => {
        colocarVentaID(unidades, codigo, empresa)
        return insertarNuevasUnidades(trx, unidades)
      })
    })
  },

  updateVentaExamen: (codigo, cliente, fecha, autorizacion, formaPago,
    descuento, subtotal, unidades, medico, paciente) => {
    return knex.transaction ((trx) => {
      return updateVentaExamen(trx, codigo, cliente, fecha, autorizacion, formaPago,
        descuento, subtotal)
      .then(() => {
        return deleteUnidadesVenta(trx, codigo, empresaExamenes)
      })
      .then(() => {
        return updateExamenInfo(trx, medico, paciente, codigo)
      })
      .then(() => {
        colocarVentaID(unidades, codigo, empresaExamenes)
        return insertarNuevasUnidades(trx, unidades)
      })
    })
  },

  findVentas: (keywords, tipo) => {
    if (tipo === 0)
      return findVentas(keywords)
    else
      return findVentasExamen(keywords)
  },

  getFacturaData,

  getExamenInfo,
  deleteVenta,
  getFacturablesVenta,
  getFacturablesVentaExamen,

}
