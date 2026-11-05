from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from safety.models import SafetyObservation, NearMissReport, AccidentReport, SafetyIncident

class Command(BaseCommand):
    help = 'Seeds initial user groups and authentic shopfloor safety records'

    def handle(self, *args, **options):
        self.stdout.write("Seeding user groups for RBAC...")
        groups = [
            'Operator',
            'Safety Coordinator',
            'Doctor',
            'Committee Reviewer',
            'Manager BI Desk'
        ]
        for name in groups:
            group, created = Group.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f"  Created group: {name}")

        self.stdout.write("Seeding Safety Observations...")
        if not SafetyObservation.objects.filter(id='so-36').exists():
            SafetyObservation.objects.create(
                id="so-36",
                srNo="36",
                date="12-Oct-26",
                shift="A",
                raisedBy="Sagar Fadtare",
                minifactory="MF3",
                line="Line 2 - Assembly",
                station="Drinking water point",
                legend="Unsafe condition",
                beforeCondition="While feeding water chances of fallen on air filter unit",
                category="B",
                ica="Installed temporary drip tray and rerouted dispenser overflow pipe away from electrical panel",
                targetDate="14-Oct-26",
                icaStatus="Closed",
                why1="Water droplets spilled on floor and splashed towards air filter enclosure",
                why2="No splash partition installed between high-pressure drinking point and plant equipment",
                why3="Dispenser was relocated during seasonal shopfloor reorganization without civil clearance",
                why4="Safety Gemba layout audit checklist did not enforce strict clearance perimeter for water stations",
                why5="Lack of cross-functional EHS review before shifting shopfloor utility fixtures",
                rootCause="Absence of mandatory EHS clearance SOP for utility equipment relocation near sensitive machinery",
                pca="Fabricated permanent 1.8m acrylic splash barrier and standardized 2-meter clearance rule across all plants",
                responsibility="Manoj Shinde (Plant Facilities)",
                dueDate="20-Oct-26",
                closingDate="19-Oct-26",
                deltaTimeToClosure="7",
                status="Closed",
                horizontalDeploymentArea="MF1, MF2, MF3 and Warehouse drinking water stations",
                horizontalDeploymentStatus="Closed",
                coordinatorName="Kavita Reddy (EHS Lead)"
            )

        if not SafetyObservation.objects.filter(id='so-37').exists():
            SafetyObservation.objects.create(
                id="so-37",
                srNo="37",
                date="12-Oct-26",
                shift="A",
                raisedBy="Ajay Alam",
                minifactory="Engineering",
                line="Validation Lab",
                station="Testing room",
                legend="Unsafe condition",
                beforeCondition="Air fumes spread in shop during test is running",
                category="A",
                ica="Restricted test cell operation to night hours; mandatory N95 particulate respirators deployed",
                targetDate="13-Oct-26",
                icaStatus="Closed",
                why1="Exhaust extraction velocity dropped below 12 m/s during full-throttle endurance test",
                why2="Exhaust scrubber fan drive belt was loose and slipping under high heat load",
                why3="Negative pressure draft damper in exhaust duct stuck at partial 25% angle",
                why4="Preventive maintenance check on blower assembly skipped during heavy test run schedule",
                why5="No automated pressure differential sensor to interlock dyno ignition with exhaust airflow",
                rootCause="Lack of automated safety interlock tripping test cycle upon exhaust airflow degradation",
                pca="Installed automated differential pressure transmitter with fail-safe dyno kill switch and new Kevlar belt drive",
                responsibility="Pravin Kulkarni (Facilities Maintenance)",
                dueDate="25-Oct-26",
                closingDate="24-Oct-26",
                deltaTimeToClosure="12",
                status="Closed",
                horizontalDeploymentArea="Testing Bays 1, 2, 3 and Emissions Prototype Cell",
                horizontalDeploymentStatus="Closed",
                coordinatorName="Kavita Reddy (EHS Lead)"
            )

        if not SafetyObservation.objects.filter(id='so-38').exists():
            SafetyObservation.objects.create(
                id="so-38",
                srNo="38",
                date="28-Oct-26",
                shift="B",
                raisedBy="Sunil Ghorpade",
                minifactory="MF1",
                line="Main Assembly Line 1",
                station="Station 04 - Pneumatic Press",
                legend="Unsafe act",
                beforeCondition="Operator found leaning over conveyor to retrieve dropped washer while indexing table in motion",
                category="A",
                ica="Immediate job halt; debriefed shift operator on pinch point dangers; issued magnetic retrieval wand",
                targetDate="29-Oct-26",
                icaStatus="Closed",
                why1="Operator reached over table without hitting E-stop",
                why2="Washers frequently bounce off parts bin into the indexing carousel gap",
                why3="Gravity feed tray lip is too shallow (only 5mm)",
                why4="Part bin redesign was not updated after washer gauge change",
                why5="Ergonomic risk assessment did not capture small hardware bounce trajectory",
                rootCause="Deficient part hopper geometry creating frequent dropped hardware near moving pinch-points",
                pca="Installed 30mm high-lip silicone funnel hoppers and optical light curtain around indexing nest",
                responsibility="Arjun Mehra (Automation Engineer)",
                dueDate="05-Nov-26",
                closingDate="",
                deltaTimeToClosure="",
                status="In-Progress",
                horizontalDeploymentArea="MF1 and MF2 press feeding stations",
                horizontalDeploymentStatus="Open",
                coordinatorName="Vikram Sen (Safety Coordinator)"
            )

        if not SafetyObservation.objects.filter(id='so-39').exists():
            SafetyObservation.objects.create(
                id="so-39",
                srNo="39",
                date="01-Nov-26",
                shift="C",
                raisedBy="Dinesh Pawale",
                minifactory="MF2",
                line="Line 3 - Packaging",
                station="Carton Strapping Bay",
                legend="Unsafe condition",
                beforeCondition="Hydraulic oil mist settling on anti-slip gangway rubber mat causing slippery footing",
                status="Open",
                coordinatorName=""
            )

        self.stdout.write("Seeding Near Miss Reports...")
        if not NearMissReport.objects.filter(id='nm-1').exists():
            NearMissReport.objects.create(
                id="nm-1",
                srNo="1",
                incidentDate="17-Feb-26",
                incidentTime="18:30",
                incidentType="Other",
                deptPlant="MF1- Between L3& L4",
                incidentReportedBy="Nagraj",
                personInvolvedName="Nagraj",
                ticketNo="TK-9402",
                exactLocation="Between L3& L4",
                briefDescription="During changeover, the trolley got stuck in a floor patch, causing the fixture to fall down.",
                causeOfIncident="1) Due to floor patch\n2) Fixture not locked",
                correctiveActionRecommended="1) Need to fill patch\n2) Awareness to all team member",
                actionTargetDate="1) 10/03/2026\n2) 18/02/2026",
                respForAction="Amol Patil\nRamesh S",
                correctiveActionTaken="1) Patch filled with industrial epoxy polymer mortar\n2) Fixture dual-lock pin standard deployed with shift training",
                horizontalDeploymentIdentify="NA",
                closingDate="3-May-26",
                status="Closed",
                coordinatorName="Vikram Sen (Safety Lead)"
            )

        if not NearMissReport.objects.filter(id='nm-2').exists():
            NearMissReport.objects.create(
                id="nm-2",
                srNo="2",
                incidentDate="14-Oct-26",
                incidentTime="11:20",
                incidentType="PD",
                deptPlant="MF2 - Stamping Bay",
                incidentReportedBy="Vijay Deshmukh",
                personInvolvedName="Deepak Shinde (Press Operator)",
                ticketNo="TK-5120",
                exactLocation="Heavy Press Line #3 Die Transfer Bed",
                briefDescription="Overhead crane hoist chain swung abruptly during die repositioning, missing operator's helmet by 6 inches.",
                causeOfIncident="1) Crane pendant speed selector button sticking on rapid traverse\n2) Tag line guide rope was not fastened to die block before hoisting",
                correctiveActionRecommended="1) Overhaul pendant joystick & replace microswitch\n2) Enforce tag line guide rope SOP for all crane lifts > 500kg",
                actionTargetDate="1) 16/10/2026\n2) 20/10/2026",
                respForAction="Ketan Patil (Electrical Maint.)\nDeepak Shinde (Area Lead)",
                correctiveActionTaken="1) Pendant microswitch replaced and dual-speed governor tested\n2) Two magnetic tag lines installed on crane column with SOP board",
                horizontalDeploymentIdentify="All overhead gantry cranes in Bay 1, 2, and Tool Room",
                closingDate="22-Oct-26",
                status="Closed",
                coordinatorName="Vikram Sen (Safety Lead)"
            )

        if not NearMissReport.objects.filter(id='nm-3').exists():
            NearMissReport.objects.create(
                id="nm-3",
                srNo="3",
                incidentDate="29-Oct-26",
                incidentTime="15:45",
                incidentType="F",
                deptPlant="MF3 - Brazing Cell",
                incidentReportedBy="Rakesh Sharma",
                personInvolvedName="Anand Verma",
                ticketNo="TK-8831",
                exactLocation="Station 02 - Torch Brazing Table",
                briefDescription="Acetylene flashback arrestor hissed and released micro-flame near hose connector during cylinder changeover.",
                causeOfIncident="Flashback arrestor O-ring perished; cylinder valve opened with sudden surge pressure.",
                correctiveActionRecommended="Replace flashback arrestors with certified dry-type thermal check valves; install quick-connect pressure regulators.",
                actionTargetDate="02/11/2026",
                respForAction="Manoj Kumar (Safety Tech)",
                correctiveActionTaken="",
                horizontalDeploymentIdentify="All 6 gas welding and brazing carts in plant",
                closingDate="",
                status="In-Progress",
                coordinatorName="Kavita Reddy (EHS Lead)"
            )

        self.stdout.write("Seeding Accident Reports...")
        if not AccidentReport.objects.filter(id='acc-1').exists():
            AccidentReport.objects.create(
                id="acc-1",
                recordNo="CR/03",
                division="Pierburg",
                accidentDate="11-01-2025",
                accidentRepDate="01/11/2025",
                department="Pierburg (Module line 1)",
                accidentTime="08:40 PM",
                leadingActivity=["M/c. Operation"],
                leadingActivityOther="",
                briefDescription="CUT INJURY ON LEFT HAND THUMB",
                immediateCorrectiveActions="Send to 1st aid in company dispensary",
                nameOfInjured="PRINCE YADAV",
                ticketNo="TS262",
                divDepartment="PIERBURG",
                ageGender="24/M",
                shift="SECOND SHIFT",
                agency="Cut injury on left hand thumb while picking machined pump body from chute",
                exactSite="PIERBURG - MODULE LINE 1",
                dutyStartTime="04:00 PM",
                resAddressInjured="Room 14, Shanti Nagar, Chakan, Pune",
                witnesses=[
                    {
                        "name": "Yogesh Shinde",
                        "address": "Chakan, Pune",
                        "ticketNo": "TS219",
                        "sign": "Y. Shinde"
                    }
                ],
                managerName="Sanjay Dhole",
                managerExtn="4102",
                plantHeadName="P. R. Kulkarni",
                bodyPartInjured="LEFT HAND THUMB",
                natureOfInjury="CUT INJURY",
                treatmentGivenOHC="CLEANING WITH BETADINE & STERILE DRESSING",
                injuredSentHospital="Dispensary OHC only",
                resumedDutyDate="JOINED AFTER OPD, SAME SHIFT",
                mandaysLost=0,
                medicalOfficerName="Dr. ARJUN CHOUDHARY",
                medicalOfficerSign="Dr. A. Choudhary, MBBS (Reg. 84219)",
                medicalReportDate="11/01/2025",
                investigationDate="12-01-2025",
                ishikawaCauses={
                    "ppe": ["Operator was not wearing designated cut-resistant level 5 safety gloves."],
                    "environmental": ["Discharge chute illumination was slightly obscured by overhead duct."],
                    "machineEquipment": ["Sharp micro-burr (0.8mm) remained on pump housing casting parting line."],
                    "injuredPerson": ["Operator hurried part pickup to meet shift cycle pace."],
                    "management": ["Daily glove verification audit was completed only once per week."],
                    "jobProcedure": ["SOP did not mandate de-burr tactile check before manual bin transfer."]
                },
                why1="Operator sustained a 1.2cm laceration on left thumb while picking the pump housing.",
                why2="Operator was handling sharp machined part without wearing designated cut-resistant safety gloves.",
                why3="Operator removed gloves 10 minutes prior because inner nitrile coating felt sweaty in humid shift.",
                why4="Plant PPE matrix had not approved breathable HPPE seamless cut-resistant gloves for humid cells.",
                why5="EHS PPE procurement had standardized on dense rubberized gloves without operator comfort trials.",
                rootCauseDescription="Inadequate ergonomic glove specification leading to operator non-compliance during high-cycle part unloading.",
                correctiveActions=[
                    {
                        "srNo": 1,
                        "correctiveAction": "Standardized breathable CoolMax Cut-Level 5 gloves across all Pierburg module lines.",
                        "responsibility": "Kavita Reddy (EHS Lead)",
                        "targetDate": "18-01-2025",
                        "status": "Completed",
                        "completedDate": "16-01-2025"
                    },
                    {
                        "srNo": 2,
                        "correctiveAction": "Trained 100% line operators on mandatory PPE adherence & chute safety OPL.",
                        "responsibility": "Sanjay Dhole (Production Mgr)",
                        "targetDate": "20-01-2025",
                        "status": "Completed",
                        "completedDate": "19-01-2025"
                    }
                ],
                investigators=[
                    "Kavita Reddy (EHS Lead)",
                    "Sanjay Dhole (Module Line Mgr)",
                    "Yogesh Shinde (Line Safety Rep)"
                ],
                status="Closed",
                closingDate="22-01-2025",
                coordinatorNotes="Investigation concluded. Zero recurrence observed over 90 days. OPL signed off by all shifts."
            )

        self.stdout.write("Seeding Safety Incidents...")
        if not SafetyIncident.objects.filter(id='sf-1').exists():
            SafetyIncident.objects.create(
                id="sf-1",
                incidentDate="2026-07-03",
                type="Unsafe Condition",
                area="Hosur Machine Shop",
                description="Frayed electrical power cable trailing on floor near CNC cutting machine pedal. Potential trip and shock hazard.",
                reportedBy="Sanjay Patil (Senior Machinist)",
                immediateAction="Taped cord temporarily, notified maintenance to replace the complete line cord.",
                status="Closed",
                targetDate="2026-07-05",
                closedDate="2026-07-04"
            )

        if not SafetyIncident.objects.filter(id='sf-2').exists():
            SafetyIncident.objects.create(
                id="sf-2",
                incidentDate="2026-07-12",
                type="Unsafe Act",
                area="Pune Heat Treat Room",
                description="Operator found loading high-temp furnace without wearing heat-resistant safety sleeves and protective visor.",
                reportedBy="Vikram Sen (Safety Lead)",
                immediateAction="Stopped operation instantly, coached worker on PPE mandate, issued correct safety sleeves.",
                status="Open",
                targetDate="2026-07-13",
                closedDate=""
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded safety desk initial data & RBAC groups!"))

