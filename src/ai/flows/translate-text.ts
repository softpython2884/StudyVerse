'use server';
/**
 * @fileOverview An AI agent for translating text.
 *
 * - translateText - A function that translates text to a target language.
 * - TranslateTextInput - The input type for the function.
 * - TranslateTextOutput - The return type for the function.
 */

import {ai}from '@/ai/genkit';
import {z}from 'genkit';

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The HTML text to be translated.'),
  targetLanguage: z.string().describe('The target language for the translation (e.g., "English", "Spanish").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated HTML text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(
  input: TranslateTextInput
): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `Translate the text content within the following HTML into {{{targetLanguage}}}.
CRITICAL: Only modify the text content. Do NOT alter any HTML tags, attributes, or the overall structure.
Only return the translated HTML, without any preamble or explanation.

Text: {{{text}}}
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
