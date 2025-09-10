'use server';
/**
 * @fileOverview An AI agent for spell and grammar checking.
 *
 * - spellCheck - A function that corrects spelling and grammar in a given text.
 * - SpellCheckInput - The input type for the spellCheck function.
 * - SpellCheckOutput - The return type for the spellCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SpellCheckInputSchema = z.object({
  text: z.string().describe('The text to be checked.'),
  language: z
    .enum(['en', 'fr'])
    .default('en')
    .describe('The language of the text (en for English, fr for French).'),
});
export type SpellCheckInput = z.infer<typeof SpellCheckInputSchema>;

const SpellCheckOutputSchema = z.object({
  correctedText: z.string().describe('The corrected text.'),
});
export type SpellCheckOutput = z.infer<typeof SpellCheckOutputSchema>;

export async function spellCheck(input: SpellCheckInput): Promise<SpellCheckOutput> {
  return spellCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spellCheckPrompt',
  input: {schema: SpellCheckInputSchema},
  output: {schema: SpellCheckOutputSchema},
  prompt: `You are an expert spell and grammar checker.
Please correct the spelling and grammar of the following text, in the specified language.
Only return the corrected text, without any preamble or explanation.

Language: {{{language}}}
Text: {{{text}}}
`,
});

const spellCheckFlow = ai.defineFlow(
  {
    name: 'spellCheckFlow',
    inputSchema: SpellCheckInputSchema,
    outputSchema: SpellCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
