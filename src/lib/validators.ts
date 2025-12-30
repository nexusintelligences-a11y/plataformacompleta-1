import { z } from "zod";

// Validators
export const cpfValidator = z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido");
export const phoneValidator = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/, "Telefone inválido");
export const emailValidator = z.string().email("Email inválido");
export const cnpjValidator = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, "CNPJ inválido");

// Masks/Formatters
export function maskCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function maskPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatCPF(cpf: string): string {
  return maskCPF(cpf);
}

export function formatPhone(phone: string): string {
  return maskPhone(phone);
}

export function generateProtocolNumber(): string {
  return `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validators
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  return /^\d{11}$/.test(cleaned) && cleaned !== '00000000000';
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const basePersonSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  email: emailValidator,
  cpf: cpfValidator,
  telefone: phoneValidator.optional(),
});

export const baseCompanySchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  cnpj: cnpjValidator,
  email: emailValidator,
  telefone: phoneValidator.optional(),
});
