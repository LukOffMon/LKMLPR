import { Layout } from './components/Layout'
import { useRuta } from './lib/router'
import { Panel } from './pages/Panel'
import { Diagnostico } from './pages/Diagnostico'
import { Ideas } from './pages/Ideas'
import { IdeaDetalle } from './pages/IdeaDetalle'
import { Protocolos, ProtocoloDetalle } from './pages/Protocolos'
import { Escalera } from './pages/Escalera'
import { Finanzas } from './pages/Finanzas'
import { CRM } from './pages/CRM'
import { Biblioteca } from './pages/Biblioteca'
import { Trampas } from './pages/Trampas'
import { Diario } from './pages/Diario'
import { Ajustes } from './pages/Ajustes'
import { Guerra } from './pages/Guerra'
import { Efectivo } from './pages/Efectivo'
import { Imperio } from './pages/Imperio'
import { Plan } from './pages/Plan'
import { Herramientas } from './pages/Herramientas'
import { Imprimir } from './pages/Imprimir'
import { FocoGlobal } from './components/Foco'
import { LogrosToast } from './components/LogrosToast'

export default function App() {
  const { seccion, param } = useRuta()

  // Las vistas de detalle se resaltan con su sección padre en la navegación.
  const navActiva = seccion === 'idea' ? 'ideas' : seccion === 'protocolo' ? 'protocolos' : seccion

  let vista
  switch (seccion) {
    case 'diagnostico': vista = <Diagnostico />; break
    case 'ideas': vista = <Ideas />; break
    case 'idea': vista = <IdeaDetalle key={param} id={param ?? ''} />; break
    case 'protocolos': vista = <Protocolos />; break
    case 'protocolo': vista = <ProtocoloDetalle key={param} id={param ?? ''} />; break
    case 'escalera': vista = <Escalera />; break
    case 'finanzas': vista = <Finanzas />; break
    case 'crm': vista = <CRM />; break
    case 'biblioteca': vista = <Biblioteca />; break
    case 'trampas': vista = <Trampas />; break
    case 'diario': vista = <Diario />; break
    case 'ajustes': vista = <Ajustes />; break
    case 'guerra': vista = <Guerra />; break
    case 'efectivo': vista = <Efectivo tabInicial={param} />; break
    case 'imperio': vista = <Imperio tabInicial={param} />; break
    case 'plan': vista = <Plan tabInicial={param} />; break
    case 'herramientas': vista = <Herramientas tabInicial={param} />; break
    case 'imprimir': vista = <Imprimir />; break
    default: vista = <Panel />
  }

  return (
    <>
      <Layout seccion={navActiva}>
        <div key={`${seccion}/${param ?? ''}`}>{vista}</div>
      </Layout>
      <FocoGlobal />
      <LogrosToast />
    </>
  )
}
