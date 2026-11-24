"""Crea la huella (hash) de una clave nueva para la llave maestra de Rojo 87.

La clave se escribe sin que se vea y nunca se guarda: solo su huella PBKDF2,
en el mismo formato que usa la API (supabase/functions/rojo87/util.ts → hashSecret).

Uso:  python rojo87/supabase/nueva-clave.py [archivo-de-salida] [--ver]
      (--ver muestra la clave mientras la escribes)
Luego se guarda en la base:  update r87_settings set value = '<huella>' where key = 'admin_pass_hash';
"""
import base64, getpass, hashlib, os, sys

ITER = 100_000


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


VER = "--ver" in sys.argv  # muestra la clave al escribirla (por defecto no se ve nada, ni asteriscos)
sys.argv = [a for a in sys.argv if a != "--ver"]
leer = input if VER else getpass.getpass
if not VER:
    print("Al escribir la clave no se verá nada en pantalla: es normal. Escríbela y presiona Enter.")

while True:
    clave = leer("Clave nueva de la llave maestra (mínimo 10 caracteres): ")
    if len(clave) < 10:
        print("Muy corta. Usa al menos 10 caracteres.")
        continue
    if leer("Repítela: ") != clave:
        print("No coinciden. Intenta de nuevo.")
        continue
    break

salt = os.urandom(16)
huella = f"pbkdf2${ITER}${b64url(salt)}${b64url(hashlib.pbkdf2_hmac('sha256', clave.encode(), salt, ITER, 32))}"
if len(sys.argv) > 1:
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        f.write(huella)
    print("Listo. Huella guardada en", sys.argv[1], "(la clave no se guardó en ningún lado).")
else:
    print(huella)
