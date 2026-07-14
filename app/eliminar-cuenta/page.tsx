import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Eliminar tu cuenta · PorotoFit',
  description: 'Cómo eliminar tu cuenta de PorotoFit y todos tus datos.',
}

// Página pública (sin login) exigida por Google Play: el formulario de Seguridad
// de los datos pide una URL donde cualquiera pueda pedir la baja de su cuenta.
export default function EliminarCuentaPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#141414]">
      <div className="max-w-2xl mx-auto px-5 py-10">

        <header className="mb-8 pb-6 border-b border-black/10">
          <div className="text-lg font-black">
            Poroto<span className="text-[#E11D2A]">Fit</span>
          </div>
          <h1 className="text-2xl font-black mt-4">Eliminar tu cuenta</h1>
          <p className="text-sm text-[#5d6358] mt-1">Última actualización: 14 de julio de 2026</p>
        </header>

        <div className="flex flex-col gap-7 text-sm leading-relaxed text-[#2b302a]">

          <section>
            <p>
              Puedes eliminar tu cuenta de PorotoFit cuando quieras. Al hacerlo se borra
              todo lo tuyo de forma permanente: no queda una copia ni se puede recuperar.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">Opción 1: desde la app (inmediato)</h2>
            <ol className="list-decimal pl-5 flex flex-col gap-1.5">
              <li>Abre PorotoFit e inicia sesión.</li>
              <li>Entra a <span className="font-semibold">Mi progreso</span>.</li>
              <li>Baja hasta el final y toca <span className="font-semibold">Eliminar mi cuenta</span>.</li>
              <li>Confirma escribiendo <span className="font-semibold">ELIMINAR</span>.</li>
            </ol>
            <p className="mt-2">El borrado ocurre al instante, sin espera ni revisión.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">Opción 2: por correo</h2>
            <p>
              Si no puedes entrar a tu cuenta, escríbenos a{' '}
              <a href="mailto:contacto@porotofit.cl" className="font-semibold text-[#E11D2A] underline">
                contacto@porotofit.cl
              </a>{' '}
              desde el mismo correo con el que te registraste, pidiendo la eliminación.
              Respondemos dentro de <span className="font-semibold">30 días</span>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">Qué se elimina</h2>
            <p className="mb-2">Todo, sin excepción:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Tu cuenta y tu correo de acceso.</li>
              <li>Tu perfil: nombre, edad, sexo, altura, peso y objetivo.</li>
              <li>Tus rutinas y ejercicios personalizados.</li>
              <li>Tus entrenamientos: series, pesos y repeticiones.</li>
              <li>Tus registros de comidas y de agua.</li>
              <li>Tu historial de peso corporal y de progreso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">Cuánto tardamos</h2>
            <p>
              Desde la app el borrado es <span className="font-semibold">inmediato</span>. Por correo,
              hasta 30 días. No conservamos copias de seguridad de cuentas eliminadas ni guardamos
              tus datos por un período adicional.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">Antes de borrar</h2>
            <p>
              Si solo quieres dejar de usar la app por un tiempo, no hace falta eliminar nada:
              basta con cerrar sesión. Tus datos te esperan cuando vuelvas.
            </p>
          </section>

        </div>

        <footer className="mt-10 pt-6 border-t border-black/10 flex flex-col gap-2 text-sm">
          <Link href="/privacidad" className="text-[#E11D2A] font-semibold">
            Política de Privacidad
          </Link>
          <p className="text-[#5d6358]">PorotoFit · Todo Import JR SPA (Chile)</p>
        </footer>

      </div>
    </div>
  )
}
