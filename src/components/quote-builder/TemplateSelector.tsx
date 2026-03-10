import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TemplateSelectorProps {
  templates: { id: string; name: string; category: string; description: string | null; default_items: any }[];
  onSelect: (template: any) => void;
}

const categoryLabels: Record<string, string> = {
  build: 'Bygg',
  electric: 'El',
  vvs: 'VVS',
  general: 'Övrigt',
  electrical: 'El',
  plumbing: 'VVS',
  painting: 'Måleri',
  carpentry: 'Bygg',
};

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  if (templates.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Utgå från en mall
        </p>
        <div className="flex gap-2 flex-wrap">
          {templates.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onSelect(template)}
            >
              {template.name}
              <span className="ml-1 text-muted-foreground">
                ({categoryLabels[template.category] || template.category})
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
