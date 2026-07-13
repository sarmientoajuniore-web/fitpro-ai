import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad · PorotoFit',
  description: 'Cómo PorotoFit recopila, usa y protege tus datos.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#141414]">
      <div className="max-w-2xl mx-auto px-5 py-10">

        <header className="mb-8 pb-6 border-b border-black/10">
          <div className="text-lg font-black">
            Poroto<span className="text-[#E11D2A]">Fit</span>
          </div>
          <h1 className="text-2xl font-black mt-4">Política de Privacidad</h1>
          <p className="text-sm text-[#5d6358] mt-1">Última actualización: 13 de julio de 2026</p>
        </header>

        <div className="flex flex-col gap-7 text-sm leading-relaxed text-[#2b302a]">

          <section>
            <p>
              En PorotoFit valoramos tu privacidad. Esta política explica qué datos recopilamos,
              para qué los usamos y qué derechos tienes sobre ellos. PorotoFit es una aplicación de
              fitness y nutrición operada por Todo Import JR SPA (Chile).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">1. Qué datos recopilamos</h2>
            <p className="mb-2">Solo recopilamos la información necesaria para que la app funcione:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><span className="font-semibold">Cuenta:</span> correo electrónico y teléfono.</li>
              <li><span className="font-semibold">Perfil:</span> nombre, edad, sexo biológico, altura, peso y tu objetivo (bajar, mantener o subir de peso).</li>
              <li><span className="font-semibold">Actividad:</span> tus rutinas, ejercicios, series, pesos y repeticiones registrados.</li>
              <li><span className="font-semibold">Nutrición e hidratación:</span> los alimentos y el agua que registras cada día.</li>
              <li><span className="font-semibold">Progreso:</span> tu historial de peso y entrenamientos para mostrarte tu evolución.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">2. Para qué usamos tus datos</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Calcular tus calorías y macronutrientes según tu objetivo.</li>
              <li>Guardar y mostrar tus rutinas, comidas y progreso.</li>
              <li>Enviarte recordatorios (por ejemplo, de hidratación), solo si los activas.</li>
              <li>Mejorar y mantener el funcionamiento de la aplicación.</li>
            </ul>
            <p className="mt-2">No usamos tus datos para publicidad ni los vendemos a nadie.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">3. Dónde se guardan</h2>
            <p>
              Tus datos se almacenan de forma segura en servidores de nuestros proveedores de
              infraestructura (Supabase y Vercel), que aplican medidas de seguridad estándar de la
              industria. Solo tú puedes acceder a tu información con tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">4. Con quién se comparten</h2>
            <p>
              No vendemos, cedemos ni compartimos tu información personal con terceros con fines
              comerciales. Solo la procesan los proveedores necesarios para operar la app (como los
              servidores mencionados) y únicamente para prestarte el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">5. Notificaciones</h2>
            <p>
              La app puede enviarte notificaciones (como recordatorios de agua). Son opcionales y
              puedes desactivarlas cuando quieras desde tu dispositivo.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">6. Tus derechos</h2>
            <p>
              Puedes acceder a tus datos, corregirlos o solicitar la eliminación de tu cuenta y de
              toda tu información en cualquier momento, escribiéndonos al correo de contacto de abajo.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">7. Menores de edad</h2>
            <p>
              PorotoFit está pensada para personas mayores de edad. Si eres menor, úsala con la
              supervisión de un adulto responsable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">8. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Publicaremos la versión vigente en
              esta misma página con su fecha de actualización.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">9. Contacto</h2>
            <p>
              Si tienes dudas sobre esta política o sobre tus datos, escríbenos a{' '}
              <a href="mailto:contacto@porotofit.cl" className="text-[#E11D2A] font-semibold">contacto@porotofit.cl</a>.
            </p>
          </section>
        </div>

        <footer className="mt-10 pt-6 border-t border-black/10">
          <Link href="/login" className="text-sm text-[#E11D2A] font-semibold">← Volver a PorotoFit</Link>
        </footer>
      </div>
    </div>
  )
}
