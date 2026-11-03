// ====== Datos de ejercicios ======
const SILABAS = {
  R:["ra re ri ro ru","rra rre rri rro rru","tra tre tri tro tru","bra bre bri bro bru"],
  L:["la le li lo lu","bla ble bli blo blu","pla ple pli plo plu"],
  S:["sa se si so su","as es is os us","esta este esto"],
  D:["da de di do du","ad ed id od ud","dra dre dri dro dru"],
  P:["pa pe pi po pu","pra pre pri pro pru"],
  C:["ca que qui co cu","cra cre cri cro cru","cla cle cli clo clu"]
};
const TRABALENGUAS = [
  {t:"Tres tristes tigres tragaban trigo en un trigal",f:"TR",n:1},
  {t:"Erre con erre cigarro, erre con erre barril, rápido ruedan los carros cargados de azúcar del ferrocarril",f:"R",n:2},
  {t:"Pablito clavó un clavito, un clavito clavó Pablito",f:"CL",n:1},
  {t:"El cielo está enladrillado, quién lo desenladrillará, el desenladrillador que lo desenladrille buen desenladrillador será",f:"varios",n:3},
  {t:"Pepe Pecas pica papas con un pico, con un pico pica papas Pepe Pecas",f:"P",n:1},
  {t:"Como poco coco como, poco coco compro",f:"C",n:1},
  {t:"Si el caracol tuviera cara como tiene el caracol, fuera cara, fuera col, fuera caracol con cara",f:"C/R",n:2},
  {t:"Compadre, cómpreme un coco. Compadre, no compro coco, porque como poco coco como, poco coco compro",f:"C",n:2},
  {t:"Un tigre, dos tigres, tres tigres comían trigo en un trigal",f:"TR",n:1},
  {t:"Cuando cuentes cuentos, cuenta cuántos cuentos cuentas, porque si no cuentas cuántos cuentos cuentas, nunca sabrás cuántos cuentos cuentas tú",f:"C",n:3},
  {t:"Parra tenía una perra y Guerra tenía una parra. La perra de Parra subió a la parra de Guerra",f:"R",n:3},
  {t:"Hoy ya es ayer y ayer ya es hoy, ya llegó el día y hoy es hoy",f:"Y",n:1}
];
const LECTURAS = [
  "La justicia que tarda no es justicia. Cada expediente detenido representa a una persona que espera una respuesta del Estado.",
  "Señoras y señores: la claridad no es un adorno del discurso. Es la forma más elemental de respeto hacia quien nos escucha.",
  "Hablar bien no consiste en decir muchas palabras, sino en elegir las precisas y pronunciarlas con intención.",
  "Los datos, por sí solos, no convencen a nadie. Lo que convence es la historia que contamos con ellos y la seguridad con que la contamos.",
  "Toda gran exposición tiene tres momentos: decir lo que se va a decir, decirlo, y recordar lo que se dijo.",
  "La pausa es el signo de puntuación de la voz. Quien no sabe callar a tiempo, no sabe hablar.",
  "El orador que domina su respiración domina su nerviosismo. El aire es el combustible de la palabra.",
  "Ante el tribunal, cada palabra cuenta. Una frase mal articulada puede sembrar una duda; una frase clara puede disiparla."
];
const TEMAS = [
  "Explica en un minuto a qué te dedicas, como si hablaras con alguien que no conoce el Poder Judicial.",
  "Defiende por qué la estadística es útil para impartir mejor justicia.",
  "Presenta un proyecto a tu jefe en 60 segundos.",
  "Cuenta una anécdota de tu infancia que te haya enseñado algo.",
  "Convence a alguien de empezar a hacer ejercicio.",
  "Describe tu ciudad ideal.",
  "Explica un tema legal complejo con palabras sencillas.",
  "Da un brindis para la boda de un amigo.",
  "Argumenta a favor y en contra del trabajo en casa.",
  "Presenta a un orador antes de su conferencia."
];
const TIPS=[
 "Graba y escucha. Tu voz grabada es la que oyen los demás; la que oyes por dentro te engaña.",
 "Las vocales llevan la claridad; las consonantes, la precisión. Abre la boca más de lo que crees necesario.",
 "Una pausa de dos segundos antes de una idea importante multiplica su impacto.",
 "Respira por la nariz y desde el abdomen: si se te suben los hombros, estás respirando mal.",
 "Hidrátate: las cuerdas vocales necesitan agua tibia, no fría, antes de hablar en público.",
 "Habla al fondo del salón: proyectar no es gritar, es dirigir el aire con intención.",
 "Cinco minutos diarios superan dos horas una vez a la semana. La constancia gana.",
 "Cambia el “este…” por silencio. El público percibe la pausa como seguridad.",
 "Termina las frases hacia abajo. Subir el tono al final suena a duda.",
 "Antes de hablar, decide la única idea que quieres que recuerden."
];
