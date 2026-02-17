import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDate(value: string | Date, pattern = "dd/MM/yyyy") {
  return format(new Date(value), pattern, { locale: fr });
}

export function formatDateTime(value: string | Date) {
  return formatDate(value, "EEE dd/MM HH:mm");
}
