import { Target, Activity, HardDrive, Eye, CloudCog, ShieldCheck, Box } from 'lucide-react';
import { PageHeader, Card } from '../components/ui-elements';

const roadmapItems = [
  {
    title: '1. Resiliencia e Ingeniería del Caos Avanzada',
    icon: <Activity className="w-5 h-5" />,
    points: [
      {
        subtitle: 'Inyección de latencia granular:',
        text: 'Capacidad de configurar retrasos artificiales por servicio, por endpoint o incluso por porcentaje de peticiones (ej. "el 10% de las llamadas a S3 tardan 3 segundos") para testear timeouts en las capas de infraestructura hexagonal.'
      },
      {
        subtitle: 'Simulación de excepciones nativas (Fault Injection):',
        text: 'Interfaz para forzar errores específicos de AWS, como un ProvisionedThroughputExceededException en DynamoDB o un 502 Bad Gateway. Esto es fundamental para validar lógicas de recuperación robustas (como las implementaciones del patrón R.A.L.P.H. — Retry And Loop Persistently until Happy) sin tener que desplegar a la nube.'
      },
      {
        subtitle: 'Interrupciones de red dirigidas:',
        text: 'Simular caídas de conectividad "cortando el cable" virtual de un contenedor específico (ej. aislar la base de datos temporalmente) para comprobar cómo el sistema maneja la consistencia eventual y la reconexión.'
      }
    ]
  },
  {
    title: '2. Gestión de Estados y Colaboración de Entornos',
    icon: <HardDrive className="w-5 h-5" />,
    points: [
      {
        subtitle: 'Snapshots de estado completo:',
        text: 'Una herramienta para congelar una imagen exacta del emulador en un momento dado (tablas pobladas, mensajes en cola, Lambdas desplegadas, archivos en S3) y volcarla en un archivo comprimido.'
      },
      {
        subtitle: 'Cloud Pods locales:',
        text: 'Un sistema de importación/exportación que permita a un desarrollador compartir su entorno exacto con otro compañero para replicar un bug, eliminando la necesidad de correr pesados scripts de seeding manuales.'
      },
      {
        subtitle: 'Integración profunda con CI/CD:',
        text: 'Comandos de CLI optimizados para inyectar un estado prefabricado justo antes de ejecutar tests de integración sobre un vertical slice en GitHub Actions o GitLab.'
      }
    ]
  },
  {
    title: '3. Observabilidad, Trazabilidad y Debugging Distribuido',
    icon: <Eye className="w-5 h-5" />,
    points: [
      {
        subtitle: 'Topología visual estilo X-Ray:',
        text: 'Un mapa interactivo en el cockpit que renderice de forma gráfica la traza completa de un evento asíncrono (ej. el camino de un payload desde API Gateway, pasando por una Lambda, hasta acabar en EventBridge y SQS).'
      },
      {
        subtitle: 'Time-travel debugging:',
        text: 'La capacidad de interceptar un evento en tránsito, pausar su ejecución en el cockpit, inspeccionar/modificar el payload JSON en caliente y reanudar su viaje.'
      },
      {
        subtitle: 'Gestión visual de Dead Letter Queues (DLQ):',
        text: 'Una vista dedicada puramente a monitorizar mensajes fallidos, con botones de un clic para inspeccionar el motivo del fallo y re-encolar (redrive) el mensaje a la cola original tras arreglar el código.'
      }
    ]
  },
  {
    title: '4. Sincronización Bidireccional con Infraestructura como Código (IaC)',
    icon: <CloudCog className="w-5 h-5" />,
    points: [
      {
        subtitle: 'Auto-descubrimiento visual:',
        text: 'Capacidad de leer archivos locales como terraform.tfstate, configuraciones de Serverless Framework o plantillas CDK, y dibujar automáticamente el diagrama de los recursos en la interfaz.'
      },
      {
        subtitle: 'Generación de código desde la UI:',
        text: 'Permitir que un agente o usuario cree un recurso haciendo clic en el cockpit (ej. crear un bucket S3) y que Floci escriba automáticamente el bloque de código Terraform equivalente en el editor.'
      },
      {
        subtitle: 'Detección de Drift local:',
        text: 'Alertas visuales cuando un recurso creado manualmente en el emulador no coincide con lo definido en el repositorio de código de infraestructura.'
      }
    ]
  },
  {
    title: '5. Desarrollo Híbrido, Proxies y Datos Reales',
    icon: <ShieldCheck className="w-5 h-5" />,
    points: [
      {
        subtitle: 'Live Cloud Proxying:',
        text: 'Soporte nativo para enrutar tráfico desde recursos vivos en AWS (como un topic SNS en staging) directamente hacia una función Lambda que el desarrollador está ejecutando en su máquina local, facilitando un bucle de feedback inmediato.'
      },
      {
        subtitle: 'Data Seeding desde la nube:',
        text: 'Integración para conectar de forma segura a una base de datos real en AWS, extraer un subconjunto de datos, anonimizarlos al vuelo e inyectarlos en el DynamoDB o RDS emulado localmente.'
      },
      {
        subtitle: 'Túneles inversos integrados:',
        text: 'Una función estilo ngrok construida dentro del cockpit para exponer un API Gateway local a internet mediante una URL temporal, útil para probar webhooks de terceros (como Stripe o GitHub).'
      }
    ]
  },
  {
    title: '6. Extensibilidad, Ecosistema y Hooks Personalizados',
    icon: <Box className="w-5 h-5" />,
    points: [
      {
        subtitle: 'SDK de Plugins:',
        text: 'Una API pública y documentada que permita a la comunidad escribir sus propios adaptadores para servicios de AWS menos comunes o herramientas propietarias que el núcleo de Floci no soporta por defecto.'
      },
      {
        subtitle: 'Interceptores HTTP programables:',
        text: 'Posibilidad de inyectar middleware personalizado (scripts ligeros) que intercepte y modifique las peticiones/respuestas entre los SDKs de AWS y el motor de emulación local.'
      },
      {
        subtitle: 'Webhooks de ciclo de vida:',
        text: 'Eventos disparados por el propio emulador (ej. floci.resource.created) para integrarse con herramientas de notificación u otros agentes de IA del entorno de desarrollo.'
      }
    ]
  }
];

const RoadmapView = () => {
  return (
    <div className="flex flex-col h-full bg-brand-bg text-brand-text">
      <PageHeader title="Enterprise Parity Roadmap" icon={<Target />} />

      <div className="p-4 lg:p-6 space-y-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="bg-brand-muted p-4 border border-brand-text mb-6">
            <h3 className="text-sm font-bold tracking-widest uppercase mb-2">Visión de Desarrollo</h3>
            <p className="text-xs normal-case opacity-80 leading-relaxed">
              Expansión detallada de áreas de mejora para alcanzar la paridad total con soluciones Enterprise en el emulador local.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roadmapItems.map((area, idx) => (
              <Card key={idx} className="flex flex-col border border-brand-text bg-white">
                <div className="p-4 border-b border-brand-text bg-brand-muted flex items-center gap-3">
                  <div className="text-brand-text">
                    {area.icon}
                  </div>
                  <h3 className="text-[11px] font-bold tracking-widest uppercase">
                    {area.title}
                  </h3>
                </div>
                <div className="p-4 flex-1 space-y-4">
                  {area.points.map((pt, pIdx) => (
                    <div key={pIdx}>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1">
                        {pt.subtitle}
                      </h4>
                      <p className="text-xs opacity-70 normal-case leading-relaxed">
                        {pt.text}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RoadmapView;
