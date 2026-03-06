"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FilePlus, Save, RotateCcw, Loader2, CheckCircle2 } from "lucide-react"
import { getOfficers, getCategories, generateFileReference, registerFile } from "@/app/register/actions"

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "missing", label: "Missing" },
]

interface Officer {
  id: string
  name: string
}

interface Category {
  id: string
  code: string
  name: string
  description: string | null
}

export function RegisterFileForm() {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [fileNumber, setFileNumber] = useState("")
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const [officersData, categoriesData] = await Promise.all([
        getOfficers(),
        getCategories()
      ])
      setOfficers(officersData)
      setCategories(categoriesData)
      setIsLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    async function updateFileReference() {
      if (selectedCategory) {
        const reference = await generateFileReference(selectedCategory.code)
        setFileNumber(reference)
      }
    }
    updateFileReference()
  }, [selectedCategory])

  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    setSelectedCategory(cat || null)
    setFormData({})
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    setSelectedCategory(null)
    setFileNumber("")
    setFormData({})
    setError(null)
    setSubmitSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return

    setIsSubmitting(true)
    setError(null)

    const result = await registerFile({
      file_reference: fileNumber,
      category_id: selectedCategory.id,
      client_name: formData.clientName || "",
      registration_id: formData.registrationId,
      date_received: formData.dateReceived || new Date().toISOString().split("T")[0],
      assigned_officer_id: formData.assignedOfficer,
      physical_location: formData.physicalLocation,
      status: formData.status || "active",
      category_specific_data: formData,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSubmitSuccess(true)
      setTimeout(() => {
        handleReset()
      }, 2000)
    } else {
      setError(result.error || "Failed to register file")
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading form data...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {submitSuccess && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">File registered successfully!</span>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Common Fields Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FilePlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Register New File</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter the file details to register it in the system
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category and File Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">Category *</Label>
              <Select value={selectedCategory?.id || ""} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category" className="bg-background border-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileNumber" className="text-foreground">File Reference Number</Label>
              <Input
                id="fileNumber"
                value={fileNumber}
                readOnly
                placeholder="Auto-generated"
                className="bg-muted border-input text-muted-foreground"
              />
            </div>
          </div>

          {/* Client / Entity Name and Registration ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-foreground">Client / Entity Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName || ""}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
                placeholder="Enter client or entity name"
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationId" className="text-foreground">Registration / ID Number</Label>
              <Input
                id="registrationId"
                value={formData.registrationId || ""}
                onChange={(e) => handleInputChange("registrationId", e.target.value)}
                placeholder="Company reg or ID number"
                className="bg-background border-input"
              />
            </div>
          </div>

          {/* Common Registration Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateReceived" className="text-foreground">Date Received *</Label>
              <Input
                id="dateReceived"
                type="date"
                value={formData.dateReceived || ""}
                onChange={(e) => handleInputChange("dateReceived", e.target.value)}
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedOfficer" className="text-foreground">Assigned Officer</Label>
              <Select 
                value={formData.assignedOfficer || ""} 
                onValueChange={(value) => handleInputChange("assignedOfficer", value)}
              >
                <SelectTrigger id="assignedOfficer" className="bg-background border-input">
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      {officer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="physicalLocation" className="text-foreground">Physical Location (Shelf/Cabinet)</Label>
              <Input
                id="physicalLocation"
                value={formData.physicalLocation || ""}
                onChange={(e) => handleInputChange("physicalLocation", e.target.value)}
                placeholder="e.g., Shelf A-12, Cabinet 3"
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground">Status *</Label>
              <Select 
                value={formData.status || "active"} 
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger id="status" className="bg-background border-input">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category-Specific Fields */}
      {selectedCategory && (
        <Card className="border-border bg-card animate-slide-in-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground">
              {selectedCategory.name} Details
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Additional information specific to this category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCategory.code === "ADM" && <ADMFields formData={formData} onChange={handleInputChange} />}
            {selectedCategory.code === "CR" && <CorporateRescueFields formData={formData} onChange={handleInputChange} />}
            {selectedCategory.code === "LC" && <LiquidationsCorporateFields formData={formData} onChange={handleInputChange} />}
            {selectedCategory.code === "LN" && <LiquidationsNaturalFields formData={formData} onChange={handleInputChange} />}
            {selectedCategory.code === "CB" && <CuratorBonisFields formData={formData} onChange={handleInputChange} />}
            {selectedCategory.code === "CL" && <CuratorAdLitemFields formData={formData} onChange={handleInputChange} />}
            {selectedCategory.code === "MISC" && <MiscellaneousFields formData={formData} onChange={handleInputChange} />}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button type="submit" disabled={!selectedCategory || isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Register File
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

interface FieldProps {
  formData: Record<string, string>
  onChange: (field: string, value: string) => void
}

function ADMFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Name of Deceased *</Label>
          <Input
            value={formData.nameOfDeceased || ""}
            onChange={(e) => onChange("nameOfDeceased", e.target.value)}
            placeholder="Full name of deceased"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Reference Details</Label>
          <Input
            value={formData.referenceDetails || ""}
            onChange={(e) => onChange("referenceDetails", e.target.value)}
            placeholder="Reference details"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Sources of Funds</Label>
          <Input
            value={formData.sourcesOfFunds || ""}
            onChange={(e) => onChange("sourcesOfFunds", e.target.value)}
            placeholder="Sources of funds"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Name of Beneficiary *</Label>
          <Input
            value={formData.nameOfBeneficiary || ""}
            onChange={(e) => onChange("nameOfBeneficiary", e.target.value)}
            placeholder="Beneficiary full name"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Beneficiary Date of Birth</Label>
          <Input
            type="date"
            value={formData.beneficiaryDOB || ""}
            onChange={(e) => onChange("beneficiaryDOB", e.target.value)}
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Guardian Name</Label>
          <Input
            value={formData.guardianName || ""}
            onChange={(e) => onChange("guardianName", e.target.value)}
            placeholder="Beneficiary guardian name"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Guardian ID Number</Label>
          <Input
            value={formData.guardianId || ""}
            onChange={(e) => onChange("guardianId", e.target.value)}
            placeholder="Guardian ID number"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Guardian Contact Details</Label>
          <Input
            value={formData.guardianContact || ""}
            onChange={(e) => onChange("guardianContact", e.target.value)}
            placeholder="Phone or email"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Date of Final Inheritance</Label>
        <Input
          type="date"
          value={formData.dateOfFinalInheritance || ""}
          onChange={(e) => onChange("dateOfFinalInheritance", e.target.value)}
          className="bg-background border-input max-w-xs"
        />
      </div>
    </div>
  )
}

function CorporateRescueFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Company Name *</Label>
          <Input
            value={formData.companyName || ""}
            onChange={(e) => onChange("companyName", e.target.value)}
            placeholder="Registered company name"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Registration Number</Label>
          <Input
            value={formData.registrationNumber || ""}
            onChange={(e) => onChange("registrationNumber", e.target.value)}
            placeholder="Company registration number"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Practitioner Details *</Label>
        <Textarea
          value={formData.practitionerDetails || ""}
          onChange={(e) => onChange("practitionerDetails", e.target.value)}
          placeholder="Name, contact, and credentials of practitioner"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Activity / Notes</Label>
        <Textarea
          value={formData.activity || ""}
          onChange={(e) => onChange("activity", e.target.value)}
          placeholder="Current activity or notes"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
    </div>
  )
}

function LiquidationsCorporateFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Company Name *</Label>
          <Input
            value={formData.companyName || ""}
            onChange={(e) => onChange("companyName", e.target.value)}
            placeholder="Registered company name"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Registration Number</Label>
          <Input
            value={formData.registrationNumber || ""}
            onChange={(e) => onChange("registrationNumber", e.target.value)}
            placeholder="Company registration number"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Practitioner Details *</Label>
        <Textarea
          value={formData.practitionerDetails || ""}
          onChange={(e) => onChange("practitionerDetails", e.target.value)}
          placeholder="Name, contact, and credentials of practitioner"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Activity / Notes</Label>
        <Textarea
          value={formData.activity || ""}
          onChange={(e) => onChange("activity", e.target.value)}
          placeholder="Current activity or notes"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
    </div>
  )
}

function LiquidationsNaturalFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Name of Person *</Label>
          <Input
            value={formData.personName || ""}
            onChange={(e) => onChange("personName", e.target.value)}
            placeholder="Full name of person"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">ID Number</Label>
          <Input
            value={formData.idNumber || ""}
            onChange={(e) => onChange("idNumber", e.target.value)}
            placeholder="ID number"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Practitioner Details *</Label>
        <Textarea
          value={formData.practitionerDetails || ""}
          onChange={(e) => onChange("practitionerDetails", e.target.value)}
          placeholder="Name, contact, and credentials of practitioner"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Activity / Notes</Label>
        <Textarea
          value={formData.activity || ""}
          onChange={(e) => onChange("activity", e.target.value)}
          placeholder="Current activity or notes"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
    </div>
  )
}

function CuratorBonisFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">HC Number *</Label>
          <Input
            value={formData.hcNumber || ""}
            onChange={(e) => onChange("hcNumber", e.target.value)}
            placeholder="High Court number"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Date of Receipt of Application</Label>
          <Input
            type="date"
            value={formData.dateOfApplication || ""}
            onChange={(e) => onChange("dateOfApplication", e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Name of Applicant *</Label>
          <Input
            value={formData.applicantName || ""}
            onChange={(e) => onChange("applicantName", e.target.value)}
            placeholder="Applicant full name"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Name of Incapacitated Person *</Label>
          <Input
            value={formData.incapacitatedPerson || ""}
            onChange={(e) => onChange("incapacitatedPerson", e.target.value)}
            placeholder="Incapacitated person full name"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Proposed Curator</Label>
          <Input
            value={formData.proposedCurator || ""}
            onChange={(e) => onChange("proposedCurator", e.target.value)}
            placeholder="Proposed curator name"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">{"Date of Master's Report Issuance"}</Label>
          <Input
            type="date"
            value={formData.mastersReportDate || ""}
            onChange={(e) => onChange("mastersReportDate", e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Outcome of Application</Label>
          <Input
            value={formData.outcomeOfApplication || ""}
            onChange={(e) => onChange("outcomeOfApplication", e.target.value)}
            placeholder="Application outcome"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Date of Outcome</Label>
          <Input
            type="date"
            value={formData.dateOfOutcome || ""}
            onChange={(e) => onChange("dateOfOutcome", e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>
    </div>
  )
}

function CuratorAdLitemFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">HC Number *</Label>
          <Input
            value={formData.hcNumber || ""}
            onChange={(e) => onChange("hcNumber", e.target.value)}
            placeholder="High Court number"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Date of Receipt of Application</Label>
          <Input
            type="date"
            value={formData.dateOfApplication || ""}
            onChange={(e) => onChange("dateOfApplication", e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Name of Applicant *</Label>
          <Input
            value={formData.applicantName || ""}
            onChange={(e) => onChange("applicantName", e.target.value)}
            placeholder="Applicant full name"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Name of Incapacitated Person *</Label>
          <Input
            value={formData.incapacitatedPerson || ""}
            onChange={(e) => onChange("incapacitatedPerson", e.target.value)}
            placeholder="Incapacitated person full name"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Proposed Curator</Label>
          <Input
            value={formData.proposedCurator || ""}
            onChange={(e) => onChange("proposedCurator", e.target.value)}
            placeholder="Proposed curator name"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">{"Date of Master's Report Issuance"}</Label>
          <Input
            type="date"
            value={formData.mastersReportDate || ""}
            onChange={(e) => onChange("mastersReportDate", e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Outcome of Application</Label>
          <Input
            value={formData.outcomeOfApplication || ""}
            onChange={(e) => onChange("outcomeOfApplication", e.target.value)}
            placeholder="Application outcome"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Date of Collection</Label>
          <Input
            type="date"
            value={formData.dateOfCollection || ""}
            onChange={(e) => onChange("dateOfCollection", e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>
    </div>
  )
}

function MiscellaneousFields({ formData, onChange }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Misc Number</Label>
          <Input
            value={formData.miscNumber || ""}
            onChange={(e) => onChange("miscNumber", e.target.value)}
            placeholder="Miscellaneous number"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Type of Document *</Label>
          <Input
            value={formData.documentType || ""}
            onChange={(e) => onChange("documentType", e.target.value)}
            placeholder="Type of document"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Received From *</Label>
          <Input
            value={formData.receivedFrom || ""}
            onChange={(e) => onChange("receivedFrom", e.target.value)}
            placeholder="Source of document"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Name of Deceased (if applicable)</Label>
          <Input
            value={formData.nameOfDeceased || ""}
            onChange={(e) => onChange("nameOfDeceased", e.target.value)}
            placeholder="Name of deceased"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Registration Number</Label>
          <Input
            value={formData.registrationNumber || ""}
            onChange={(e) => onChange("registrationNumber", e.target.value)}
            placeholder="Registration number"
            className="bg-background border-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Details Recorded By</Label>
          <Input
            value={formData.recordedBy || ""}
            onChange={(e) => onChange("recordedBy", e.target.value)}
            placeholder="Name of recorder"
            className="bg-background border-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Subject Matter *</Label>
        <Textarea
          value={formData.subjectMatter || ""}
          onChange={(e) => onChange("subjectMatter", e.target.value)}
          placeholder="Describe the subject matter"
          className="bg-background border-input min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">DR Number (when estate is eventually registered)</Label>
        <Input
          value={formData.drNumber || ""}
          onChange={(e) => onChange("drNumber", e.target.value)}
          placeholder="DR number"
          className="bg-background border-input max-w-xs"
        />
      </div>
    </div>
  )
}
