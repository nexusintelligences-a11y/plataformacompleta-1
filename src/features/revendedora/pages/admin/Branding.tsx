import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BrandingLogoUploader } from "@/features/revendedora/components/BrandingLogoUploader";
import { ColorPicker } from "@/features/revendedora/components/ColorPicker";
import { PaletteSuggestions } from "@/features/revendedora/components/PaletteSuggestions";
import BrandingPreview from "@/features/revendedora/components/BrandingPreview";
import { Save, RotateCcw, Eye } from "lucide-react";
import { supabase } from "@/features/revendedora/integrations/supabase/client";
import { hexToHSL, type ColorPalette, type PaletteVariation, generatePaletteVariations } from "@/features/revendedora/utils/colorExtractor";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

interface CompanyData {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  logo_size?: string;
  logo_position?: string;
  color_palette?: string[];
  branding_updated_at?: string;
  background_color?: string;
  sidebar_background?: string;
  sidebar_text?: string;
  button_color?: string;
  button_text_color?: string;
  text_color?: string;
  heading_color?: string;
  selected_item_color?: string;
}

export default function Branding() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [primaryColor, setPrimaryColor] = useState("#9b87f5");
  const [secondaryColor, setSecondaryColor] = useState("#7e69ab");
  const [accentColor, setAccentColor] = useState("#d946ef");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [sidebarBackground, setSidebarBackground] = useState("#1a1a1a");
  const [sidebarText, setSidebarText] = useState("#ffffff");
  const [buttonColor, setButtonColor] = useState("#9b87f5");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#000000");
  const [headingColor, setHeadingColor] = useState("#1a1a1a");
  const [selectedItemColor, setSelectedItemColor] = useState("#9b87f5");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoSize, setLogoSize] = useState("medium");
  const [logoPosition, setLogoPosition] = useState("left");
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [paletteVariations, setPaletteVariations] = useState<PaletteVariation[]>([]);

  const fetchCompany = async () => {
    if (!supabase) {
      console.log('[Branding] Supabase not configured');
      toast.info("Configure as credenciais do Supabase para salvar as personalizações");
      return;
    }

    console.log('[Branding] Fetching company data...');
    
    // Busca a primeira empresa da tabela (já que não temos autenticação)
    const { data, error } = await supabase
      .from('companies' as any)
      .select('id, primary_color, secondary_color, accent_color, logo_url, logo_size, logo_position, color_palette, branding_updated_at, background_color, sidebar_background, sidebar_text, button_color, button_text_color, text_color, heading_color, selected_item_color')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Branding] Error fetching company:', error);
      toast.error(`Erro ao buscar empresa: ${error.message}`);
      return;
    }

    if (data) {
      console.log('[Branding] Company found:', data);
      const companyData = data as any as CompanyData;
      setCompany(companyData);
      setPrimaryColor(companyData.primary_color || "#9b87f5");
      setSecondaryColor(companyData.secondary_color || "#7e69ab");
      setAccentColor(companyData.accent_color || "#d946ef");
      setBackgroundColor(companyData.background_color || "#ffffff");
      setSidebarBackground(companyData.sidebar_background || "#1a1a1a");
      setSidebarText(companyData.sidebar_text || "#ffffff");
      setButtonColor(companyData.button_color || "#9b87f5");
      setButtonTextColor(companyData.button_text_color || "#ffffff");
      setTextColor(companyData.text_color || "#000000");
      setHeadingColor(companyData.heading_color || "#1a1a1a");
      setSelectedItemColor(companyData.selected_item_color || "#9b87f5");
      setLogoUrl(companyData.logo_url || "");
      setLogoSize(companyData.logo_size || "medium");
      setLogoPosition(companyData.logo_position || "left");
      setColorPalette(companyData.color_palette || []);
      toast.success("Dados da empresa carregados!");
    } else {
      console.log('[Branding] No company found, creating new one...');
      
      const { data: newCompany, error: createError } = await supabase
        .from('companies' as any)
        .insert({
          company_name: 'Minha Empresa',
          primary_color: "#9b87f5",
          secondary_color: "#7e69ab",
          accent_color: "#d946ef",
        })
        .select('id, primary_color, secondary_color, accent_color, logo_url, color_palette, branding_updated_at')
        .single();

      if (createError) {
        console.error('[Branding] Error creating company:', createError);
        toast.error(`Erro ao criar empresa: ${createError.message}`);
        return;
      }

      if (newCompany) {
        console.log('[Branding] Company created successfully:', newCompany);
        const companyData = newCompany as any as CompanyData;
        setCompany(companyData);
        toast.success("Empresa criada com sucesso!");
      }
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const handleColorsExtracted = (colors: ColorPalette) => {
    setPrimaryColor(colors.primary);
    setSecondaryColor(colors.secondary);
    setAccentColor(colors.accent);
    setColorPalette(colors.palette);
    setHasChanges(true);
    
    const variations = generatePaletteVariations(colors);
    setPaletteVariations(variations);
    
    applyColorsToPreview(colors.primary, colors.secondary, colors.accent);
  };

  const handleSelectVariation = (variation: PaletteVariation) => {
    setPrimaryColor(variation.primary);
    setSecondaryColor(variation.secondary);
    setAccentColor(variation.accent);
    setColorPalette(variation.colors);
    setHasChanges(true);
    
    applyColorsToPreview(variation.primary, variation.secondary, variation.accent);
    
    toast.success(`${variation.name} aplicada!`, {
      description: "Cores atualizadas com sucesso"
    });
  };

  const handleLogoUpload = (file: File, url: string) => {
    setLogoFile(file);
    setLogoUrl(url);
    setHasChanges(true);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoUrl("");
    setHasChanges(true);
  };

  const applyColorsToPreview = (primary: string, secondary: string, accent: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHSL(primary));
    root.style.setProperty('--secondary', hexToHSL(secondary));
    root.style.setProperty('--accent', hexToHSL(accent));
  };

  const handleColorChange = (type: string, value: string) => {
    switch(type) {
      case 'primary': setPrimaryColor(value); break;
      case 'secondary': setSecondaryColor(value); break;
      case 'accent': setAccentColor(value); break;
      case 'background': setBackgroundColor(value); break;
      case 'sidebar_background': setSidebarBackground(value); break;
      case 'sidebar_text': setSidebarText(value); break;
      case 'button': setButtonColor(value); break;
      case 'button_text': setButtonTextColor(value); break;
      case 'text': setTextColor(value); break;
      case 'heading': setHeadingColor(value); break;
      case 'selected': setSelectedItemColor(value); break;
    }
    
    setHasChanges(true);
    applyColorsToPreview(
      type === 'primary' ? value : primaryColor,
      type === 'secondary' ? value : secondaryColor,
      type === 'accent' ? value : accentColor
    );
  };

  const handlePreview = () => {
    applyColorsToPreview(primaryColor, secondaryColor, accentColor);
    toast.success("Preview atualizado!", {
      description: "As cores estão sendo aplicadas em tempo real"
    });
  };

  const handleReset = () => {
    const defaultPrimary = company?.primary_color || "#9b87f5";
    const defaultSecondary = company?.secondary_color || "#7e69ab";
    const defaultAccent = company?.accent_color || "#d946ef";
    
    setPrimaryColor(defaultPrimary);
    setSecondaryColor(defaultSecondary);
    setAccentColor(defaultAccent);
    setBackgroundColor(company?.background_color || "#ffffff");
    setSidebarBackground(company?.sidebar_background || "#1a1a1a");
    setSidebarText(company?.sidebar_text || "#ffffff");
    setButtonColor(company?.button_color || "#9b87f5");
    setButtonTextColor(company?.button_text_color || "#ffffff");
    setTextColor(company?.text_color || "#000000");
    setHeadingColor(company?.heading_color || "#1a1a1a");
    setSelectedItemColor(company?.selected_item_color || "#9b87f5");
    setLogoUrl(company?.logo_url || "");
    setLogoSize(company?.logo_size || "medium");
    setLogoPosition(company?.logo_position || "left");
    setLogoFile(null);
    setColorPalette(company?.color_palette || []);
    setHasChanges(false);
    
    applyColorsToPreview(defaultPrimary, defaultSecondary, defaultAccent);
    toast.info("Configurações resetadas");
  };

  const handleSave = async () => {
    if (!company) {
      console.error('[Branding] Cannot save: company not found');
      toast.error("Empresa não encontrada. Recarregue a página.");
      return;
    }

    console.log('[Branding] Starting save process...');
    console.log('[Branding] Company ID:', company.id);
    console.log('[Branding] Colors:', { primaryColor, secondaryColor, accentColor });
    console.log('[Branding] Has logo file:', !!logoFile);

    setIsSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        console.log('[Branding] Uploading logo...');
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${company.id}-logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('company-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('[Branding] Upload error:', uploadError);
          toast.error(`Erro ao fazer upload da logo: ${uploadError.message}`);
          return;
        }

        console.log('[Branding] Logo uploaded successfully');
        const { data: { publicUrl } } = supabase.storage
          .from('company-logos')
          .getPublicUrl(fileName);
        
        finalLogoUrl = publicUrl;
        console.log('[Branding] Logo URL:', finalLogoUrl);
      }

      console.log('[Branding] Updating company data in Supabase...');
      const updateData = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        background_color: backgroundColor,
        sidebar_background: sidebarBackground,
        sidebar_text: sidebarText,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        text_color: textColor,
        heading_color: headingColor,
        selected_item_color: selectedItemColor,
        logo_size: logoSize,
        logo_position: logoPosition,
        color_palette: colorPalette,
        logo_url: finalLogoUrl || null,
        branding_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log('[Branding] Update data:', updateData);

      const { error: updateError, data: updateResult } = await supabase
        .from('companies' as any)
        .update(updateData)
        .eq('id', company.id)
        .select();

      if (updateError) {
        console.error('[Branding] Update error:', updateError);
        toast.error(`Erro ao salvar configurações: ${updateError.message}`);
        return;
      }

      console.log('[Branding] Update successful:', updateResult);

      await fetchCompany();
      setHasChanges(false);
      setLogoFile(null);
      
      toast.success("Personalização salva com sucesso!", {
        description: "As alterações foram aplicadas à plataforma"
      });
    } catch (error: any) {
      console.error('[Branding] Save error:', error);
      toast.error(`Erro ao salvar personalização: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col p-6 h-[calc(100vh-4rem)]">
      <div className="flex-shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Personalização da Plataforma</h1>
          <p className="text-muted-foreground mt-1">
            Customize as cores e a logo da plataforma para seus revendedores
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:overflow-hidden lg:min-h-0">
        <PanelGroup 
          direction="horizontal" 
          autoSaveId="branding-layout"
          className="flex-1"
        >
          <Panel 
            defaultSize={65} 
            minSize={30}
          >
            <div className="h-full p-4 lg:pr-2">
              <BrandingPreview
                backgroundColor={backgroundColor}
                sidebarBackground={sidebarBackground}
                sidebarText={sidebarText}
                buttonColor={buttonColor}
                buttonTextColor={buttonTextColor}
                textColor={textColor}
                headingColor={headingColor}
                selectedItemColor={selectedItemColor}
                logoUrl={logoUrl}
                logoSize={logoSize}
                logoPosition={logoPosition}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-border hover:bg-primary transition-colors duration-200 cursor-col-resize hidden lg:block" />

          <Panel 
            defaultSize={35} 
            minSize={25}
          >
            <div className="h-full overflow-y-auto p-4 space-y-6">
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!hasChanges}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Pré-visualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges || isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Logo da Empresa</CardTitle>
                  <CardDescription>
                    Envie a logo da sua empresa. As cores serão extraídas automaticamente para personalizar a plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <BrandingLogoUploader
                    currentLogo={logoUrl}
                    onLogoUpload={handleLogoUpload}
                    onColorsExtracted={handleColorsExtracted}
                    onRemove={handleLogoRemove}
                  />
                  
                  {logoUrl && (
                    <>
                      <div className="space-y-3">
                        <Label>Tamanho da Logo</Label>
                        <RadioGroup 
                          value={logoSize} 
                          onValueChange={(value) => {
                            setLogoSize(value);
                            setHasChanges(true);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="small" id="small" />
                            <Label htmlFor="small" className="cursor-pointer font-normal">
                              Pequeno (32px)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <Label htmlFor="medium" className="cursor-pointer font-normal">
                              Médio (48px)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="large" id="large" />
                            <Label htmlFor="large" className="cursor-pointer font-normal">
                              Grande (64px)
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label>Posição da Logo</Label>
                        <RadioGroup 
                          value={logoPosition} 
                          onValueChange={(value) => {
                            setLogoPosition(value);
                            setHasChanges(true);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="left" id="left" />
                            <Label htmlFor="left" className="cursor-pointer font-normal">
                              Esquerda
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="center" id="center" />
                            <Label htmlFor="center" className="cursor-pointer font-normal">
                              Centro
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="right" id="right" />
                            <Label htmlFor="right" className="cursor-pointer font-normal">
                              Direita
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                  
                  {paletteVariations.length > 0 && (
                    <PaletteSuggestions
                      variations={paletteVariations}
                      onSelectVariation={handleSelectVariation}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cores Principais</CardTitle>
                  <CardDescription>
                    Cores principais da plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ColorPicker
                    label="Cor Primária"
                    value={primaryColor}
                    onChange={(value) => handleColorChange('primary', value)}
                    description="Cor principal da marca"
                  />
                  
                  <ColorPicker
                    label="Cor Secundária"
                    value={secondaryColor}
                    onChange={(value) => handleColorChange('secondary', value)}
                    description="Cor de suporte"
                  />
                  
                  <ColorPicker
                    label="Cor de Destaque"
                    value={accentColor}
                    onChange={(value) => handleColorChange('accent', value)}
                    description="Chamadas de atenção e destaques"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cores de Fundo e Superfícies</CardTitle>
                  <CardDescription>
                    Defina as cores de fundo da aplicação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ColorPicker
                    label="Fundo Geral"
                    value={backgroundColor}
                    onChange={(value) => handleColorChange('background', value)}
                    description="Cor de fundo principal da aplicação"
                  />
                  
                  <ColorPicker
                    label="Fundo da Barra Lateral"
                    value={sidebarBackground}
                    onChange={(value) => handleColorChange('sidebar_background', value)}
                    description="Cor de fundo do menu lateral"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cores de Texto</CardTitle>
                  <CardDescription>
                    Personalize as cores dos textos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ColorPicker
                    label="Texto Geral"
                    value={textColor}
                    onChange={(value) => handleColorChange('text', value)}
                    description="Cor do texto comum da aplicação"
                  />
                  
                  <ColorPicker
                    label="Títulos"
                    value={headingColor}
                    onChange={(value) => handleColorChange('heading', value)}
                    description="Cor dos títulos e cabeçalhos"
                  />
                  
                  <ColorPicker
                    label="Texto da Barra Lateral"
                    value={sidebarText}
                    onChange={(value) => handleColorChange('sidebar_text', value)}
                    description="Cor do texto no menu lateral"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cores de Botões e Seleção</CardTitle>
                  <CardDescription>
                    Cores para botões e itens selecionados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ColorPicker
                    label="Cor dos Botões"
                    value={buttonColor}
                    onChange={(value) => handleColorChange('button', value)}
                    description="Cor de fundo dos botões principais"
                  />
                  
                  <ColorPicker
                    label="Texto dos Botões"
                    value={buttonTextColor}
                    onChange={(value) => handleColorChange('button_text', value)}
                    description="Cor do texto dentro dos botões"
                  />
                  
                  <ColorPicker
                    label="Itens Selecionados"
                    value={selectedItemColor}
                    onChange={(value) => handleColorChange('selected', value)}
                    description="Cor para itens selecionados no menu"
                  />
                </CardContent>
              </Card>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
