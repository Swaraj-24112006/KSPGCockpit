"""
PPSR Serializers — DRF Serializers for PPSR Reports, Meetings, & CFT Ratings
=============================================================================
Serializers for validation, nested writes, spreadsheet metrics calculation,
and JSON data transformation across all PPSR entities.
"""

from datetime import date
from rest_framework import serializers
from .models import (
    PpsrReport,
    ContainmentAction,
    CorrectiveAction,
    StandardizationItem,
    ReadAcrossItem,
    FiveWhysChain,
    PpsrMeetingLog,
    CommitteeFeedback,
    CftMember,
    CftRating,
)
from .services import generate_ppsr_number, calculate_spreadsheet_metrics


# ============================================================================
# Task 3.1 — Child Action Serializers
# ============================================================================

class ContainmentActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContainmentAction
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True},
            'responsible': {'required': False, 'allow_blank': True},
            'date': {'required': False},
            'status': {'required': False},
        }


class CorrectiveActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectiveAction
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True},
            'responsible': {'required': False, 'allow_blank': True},
            'deadline': {'required': False},
            'status': {'required': False},
        }


class StandardizationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandardizationItem
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True},
            'responsible': {'required': False, 'allow_blank': True},
            'date': {'required': False},
            'status': {'required': False},
        }


class ReadAcrossItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadAcrossItem
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True},
            'responsible': {'required': False, 'allow_blank': True},
            'deadline': {'required': False},
        }


class FiveWhysChainSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiveWhysChain
        fields = '__all__'
        read_only_fields = ['id']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }

    def to_internal_value(self, data):
        if isinstance(data, dict):
            normalized = dict(data)
            for i in range(1, 4):
                col = f'column{i}'
                col_snake = f'column_{i}'
                val = normalized.get(col) if normalized.get(col) is not None else normalized.get(col_snake, [])
                normalized[col] = [str(x) for x in val if x]
            data = normalized
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        for i in range(1, 4):
            val = getattr(instance, f'column{i}', []) or []
            ret[f'column{i}'] = val
            ret[f'column_{i}'] = val
        return ret


# ============================================================================
# Task 3.2 — Lightweight List Serializer
# ============================================================================

class PpsrReportListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for Register spreadsheet list view and Review Board table.
    Returns only table display columns — omits heavy nested JSON blobs.
    """
    root_cause_analysis = serializers.SerializerMethodField()

    class Meta:
        model = PpsrReport
        fields = [
            'id',
            'ppsr_no',
            'title',
            'problem_statement',
            'plant',
            'line_station',
            'lead_owner',
            'discovered_by',
            'discovered_on',
            'status',
            'committee_decision',
            'root_cause_analysis',
            'cost_save_per_month',
            'cost_save_per_annum',
            'std_status_mf',
            'week',
            'jira_number',
            'created_at',
        ]
        read_only_fields = fields

    def get_root_cause_analysis(self, obj: PpsrReport) -> str:
        """
        Extract and truncate root cause summary (max 200 chars).
        Checks 5-whys chain, standard worksheet findings, or problem statement.
        """
        summary = ""
        if hasattr(obj, 'five_whys') and obj.five_whys:
            whys = []
            for col in [obj.five_whys.column1, obj.five_whys.column2, obj.five_whys.column3]:
                if isinstance(col, list) and col:
                    whys.extend([str(item) for item in col if item])
            if whys:
                summary = " -> ".join(whys)

        if not summary and obj.standard_worksheet and isinstance(obj.standard_worksheet, list):
            causes = [
                row.get('root_cause', '') or row.get('cause', '')
                for row in obj.standard_worksheet
                if isinstance(row, dict)
            ]
            causes = [c for c in causes if c]
            if causes:
                summary = ", ".join(causes)

        if not summary:
            summary = obj.problem_statement or ""

        return summary[:200]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        aliases = {
            'ppsrNo': ret.get('ppsr_no'),
            'problemStatement': ret.get('problem_statement'),
            'leadOwner': ret.get('lead_owner'),
            'lineStation': ret.get('line_station'),
            'discoveredOn': ret.get('discovered_on'),
            'discoveredBy': ret.get('discovered_by'),
            'committeeDecision': ret.get('committee_decision'),
            'rootCauseAnalysis': ret.get('root_cause_analysis'),
            'costSavePerMonth': ret.get('cost_save_per_month'),
            'costSavePerAnnum': ret.get('cost_save_per_annum'),
            'stdStatusMF': ret.get('std_status_mf'),
            'jiraNumber': ret.get('jira_number'),
            'createdAt': ret.get('created_at'),
        }
        for k, v in aliases.items():
            if k not in ret and v is not None:
                ret[k] = v
        return ret


# ============================================================================
# Task 3.3 — Full Detail Serializer (with nested writes)
# ============================================================================

class PpsrReportDetailSerializer(serializers.ModelSerializer):
    """
    Complete detail serializer for form submission, sheet inspection,
    and presentation mode with full nested child serializers and write handling.
    """
    containment_actions = ContainmentActionSerializer(many=True, required=False)
    corrective_actions = CorrectiveActionSerializer(many=True, required=False)
    standardization_items = StandardizationItemSerializer(many=True, required=False)
    read_across_items = ReadAcrossItemSerializer(many=True, required=False)
    five_whys = FiveWhysChainSerializer(required=False, allow_null=True)

    class Meta:
        model = PpsrReport
        fields = '__all__'
        read_only_fields = ['id', 'ppsr_no', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if isinstance(data, dict):
            normalized = dict(data)
            mapping = {
                'ppsrNo': 'ppsr_no',
                'problemStatement': 'problem_statement',
                'leadOwner': 'lead_owner',
                'projectLeader': 'project_leader',
                'teamMembers': 'team_members',
                'lineStation': 'line_station',
                'productComponent': 'product_component',
                'amountDefects': 'amount_defects',
                'discoveredOn': 'discovered_on',
                'discoveredBy': 'discovered_by',
                'repeatCase': 'repeat_case',
                'targetDate': 'target_date',
                'sketchPhoto': 'sketch_photo',
                'initialEvidenceType': 'initial_evidence_type',
                'initialDefectTrendData': 'initial_defect_trend_data',
                'factsAnalysis': 'facts_analysis',
                'causeLocalizationApproach': 'cause_localization_approach',
                'standardWorksheet': 'standard_worksheet',
                'psqTreeData': 'psq_tree_data',
                'effectivenessEvidence': 'effectiveness_evidence',
                'evidenceType': 'evidence_type',
                'defectTrendData': 'defect_trend_data',
                'effectivenessChartData': 'effectiveness_chart_data',
                'readAcrossExplanation': 'read_across_explanation',
                'completionSignatures': 'completion_signatures',
                'containmentActionsList': 'containment_actions',
                'containment_actions_list': 'containment_actions',
                'correctiveActionsList': 'corrective_actions',
                'corrective_actions_list': 'corrective_actions',
                'standardizationList': 'standardization_items',
                'standardization_list': 'standardization_items',
                'readAcrossList': 'read_across_items',
                'read_across_list': 'read_across_items',
                'fiveWhysList': 'five_whys',
                'five_whys_list': 'five_whys',
                'jiraNumber': 'jira_number',
                'stdStatusMF': 'std_status_mf',
                'std_status_m_f': 'std_status_mf',
                'stdDate': 'std_date',
                'effDaysStd': 'eff_days_std',
                'ppsrEndDate': 'ppsr_end_date',
                'effDaysClosePpsr': 'eff_days_close_ppsr',
                'prodQtyBefore': 'prod_qty_before',
                'rejectedQtyBefore': 'rejected_qty_before',
                'pctBefore': 'pct_before',
                'prodQtyAfter': 'prod_qty_after',
                'rejectedQtyAfter': 'rejected_qty_after',
                'pctAfter': 'pct_after',
                'effectivityText': 'effectivity_text',
                'custDemandQtyMonth': 'cust_demand_qty_month',
                'custDemandQtyAnnum': 'cust_demand_qty_annum',
                'qtyMonthBeforeRejPct': 'qty_month_before_rej_pct',
                'qtyMonthAfterRejPct': 'qty_month_after_rej_pct',
                'qtyMonthSavedRejPct': 'qty_month_saved_rej_pct',
                'perSetRejectionCost': 'per_set_rejection_cost',
                'costSavePerMonth': 'cost_save_per_month',
                'costSavePerAnnum': 'cost_save_per_annum',
                'committeeDecision': 'committee_decision',
                'committeeDecisionDate': 'committee_decision_date',
                'steeringCommitteeSign': 'steering_committee_sign',
                'fishbone': 'ishikawa',
            }
            for camel, snake in mapping.items():
                if camel in normalized and snake not in normalized:
                    normalized[snake] = normalized[camel]

            lead_owner = normalized.get('lead_owner') or normalized.get('leadOwner') or 'Initiator'
            if 'plant' not in normalized or not normalized['plant']:
                normalized['plant'] = 'Pune Assembly & Paint Complex'

            today_str = date.today().isoformat()

            # Clean date fields if empty string
            date_fields = ['discovered_on', 'target_date', 'std_date', 'ppsr_end_date', 'committee_decision_date']
            for df in date_fields:
                if df in normalized and (normalized[df] == '' or normalized[df] is None):
                    normalized[df] = None

            # Clean containment_actions
            if 'containment_actions' in normalized and isinstance(normalized['containment_actions'], list):
                cleaned_c = []
                for i, item in enumerate(normalized['containment_actions']):
                    if isinstance(item, dict):
                        action_text = (item.get('action') or '').strip()
                        if action_text:
                            cleaned_c.append({
                                'no': item.get('no', i + 1),
                                'action': action_text,
                                'responsible': (item.get('responsible') or '').strip() or lead_owner,
                                'date': item.get('date') or today_str,
                                'status': item.get('status') or 'implemented',
                            })
                normalized['containment_actions'] = cleaned_c

            # Clean corrective_actions
            if 'corrective_actions' in normalized and isinstance(normalized['corrective_actions'], list):
                cleaned_ca = []
                for i, item in enumerate(normalized['corrective_actions']):
                    if isinstance(item, dict):
                        measure_text = (item.get('measure') or '').strip()
                        if measure_text:
                            cleaned_ca.append({
                                'no': item.get('no', i + 1),
                                'measure': measure_text,
                                'responsible': (item.get('responsible') or '').strip() or lead_owner,
                                'deadline': item.get('deadline') or today_str,
                                'status': item.get('status') or 'completed',
                            })
                normalized['corrective_actions'] = cleaned_ca

            # Clean standardization_items
            if 'standardization_items' in normalized and isinstance(normalized['standardization_items'], list):
                cleaned_s = []
                for i, item in enumerate(normalized['standardization_items']):
                    if isinstance(item, dict):
                        measure_text = (item.get('measure') or '').strip()
                        if measure_text:
                            cleaned_s.append({
                                'no': item.get('no', i + 1),
                                'measure': measure_text,
                                'responsible': (item.get('responsible') or '').strip() or lead_owner,
                                'date': item.get('date') or today_str,
                                'status': item.get('status') or 'completed',
                            })
                normalized['standardization_items'] = cleaned_s

            # Clean read_across_items
            if 'read_across_items' in normalized and isinstance(normalized['read_across_items'], list):
                cleaned_r = []
                for i, item in enumerate(normalized['read_across_items']):
                    if isinstance(item, dict):
                        proposal_text = (item.get('proposal') or '').strip()
                        if proposal_text:
                            cleaned_r.append({
                                'no': item.get('no', i + 1),
                                'proposal': proposal_text,
                                'responsible': (item.get('responsible') or '').strip() or lead_owner,
                                'deadline': item.get('deadline') or today_str,
                            })
                normalized['read_across_items'] = cleaned_r

            # Clean five_whys
            if 'five_whys' in normalized and isinstance(normalized['five_whys'], dict):
                fw = normalized['five_whys']
                c1 = fw.get('column1') if fw.get('column1') is not None else fw.get('column_1', [])
                c2 = fw.get('column2') if fw.get('column2') is not None else fw.get('column_2', [])
                c3 = fw.get('column3') if fw.get('column3') is not None else fw.get('column_3', [])
                normalized['five_whys'] = {
                    'column1': [str(x) for x in c1 if x],
                    'column2': [str(x) for x in c2 if x],
                    'column3': [str(x) for x in c3 if x],
                }

            # Dual-key facts_analysis
            facts = normalized.get('facts_analysis') or normalized.get('factsAnalysis')
            if isinstance(facts, dict):
                dual_facts = dict(facts)
                pairs = [
                    ('whatIs', 'what_is'),
                    ('whatIsNot', 'what_is_not'),
                    ('whereIs', 'where_is'),
                    ('whereIsNot', 'where_is_not'),
                    ('howIs', 'how_is'),
                    ('howIsNot', 'how_is_not'),
                    ('whenIs', 'when_is'),
                    ('whenIsNot', 'when_is_not'),
                ]
                for camel, snake in pairs:
                    val = dual_facts.get(camel) if dual_facts.get(camel) is not None else dual_facts.get(snake)
                    if val is not None:
                        dual_facts[camel] = val
                        dual_facts[snake] = val
                normalized['facts_analysis'] = dual_facts

            # Dual-key completion_signatures
            sigs = normalized.get('completion_signatures') or normalized.get('completionSignatures')
            if isinstance(sigs, dict):
                dual_sigs = dict(sigs)
                pairs = [
                    ('projectLeader', 'project_leader'),
                    ('steeringCommittee', 'steering_committee'),
                    ('completedOn', 'completed_on'),
                ]
                for camel, snake in pairs:
                    val = dual_sigs.get(camel) if dual_sigs.get(camel) is not None else dual_sigs.get(snake)
                    if val is not None:
                        dual_sigs[camel] = val
                        dual_sigs[snake] = val
                normalized['completion_signatures'] = dual_sigs

            # Dual-key trend data arrays
            for trend_field in ['initial_defect_trend_data', 'defect_trend_data', 'initialDefectTrendData', 'defectTrendData']:
                items = normalized.get(trend_field)
                if isinstance(items, list):
                    dual_items = []
                    for it in items:
                        if isinstance(it, dict):
                            d_item = dict(it)
                            val = d_item.get('defectsCount') if d_item.get('defectsCount') is not None else d_item.get('defects_count')
                            if val is not None:
                                d_item['defectsCount'] = val
                                d_item['defects_count'] = val
                            dual_items.append(d_item)
                        else:
                            dual_items.append(it)
                    normalized['initial_defect_trend_data' if 'initial' in trend_field.lower() else 'defect_trend_data'] = dual_items

            data = normalized

        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        aliases = {
            'ppsrNo': ret.get('ppsr_no'),
            'problemStatement': ret.get('problem_statement'),
            'leadOwner': ret.get('lead_owner'),
            'projectLeader': ret.get('project_leader'),
            'teamMembers': ret.get('team_members'),
            'lineStation': ret.get('line_station'),
            'productComponent': ret.get('product_component'),
            'amountDefects': ret.get('amount_defects'),
            'discoveredOn': ret.get('discovered_on'),
            'discoveredBy': ret.get('discovered_by'),
            'repeatCase': ret.get('repeat_case'),
            'targetDate': ret.get('target_date'),
            'initialEvidenceType': ret.get('initial_evidence_type'),
            'initialDefectTrendData': ret.get('initial_defect_trend_data'),
            'factsAnalysis': ret.get('facts_analysis'),
            'causeLocalizationApproach': ret.get('cause_localization_approach'),
            'standardWorksheet': ret.get('standard_worksheet'),
            'psqTreeData': ret.get('psq_tree_data'),
            'effectivenessEvidence': ret.get('effectiveness_evidence'),
            'evidenceType': ret.get('evidence_type'),
            'defectTrendData': ret.get('defect_trend_data'),
            'effectivenessChartData': ret.get('effectiveness_chart_data'),
            'readAcrossExplanation': ret.get('read_across_explanation'),
            'completionSignatures': ret.get('completion_signatures'),
            'containmentActionsList': ret.get('containment_actions'),
            'correctiveActionsList': ret.get('corrective_actions'),
            'standardizationList': ret.get('standardization_items'),
            'readAcrossList': ret.get('read_across_items'),
            'fiveWhysList': ret.get('five_whys'),
            'jiraNumber': ret.get('jira_number'),
            'stdStatusMF': ret.get('std_status_mf'),
            'stdDate': ret.get('std_date'),
            'effDaysStd': ret.get('eff_days_std'),
            'ppsrEndDate': ret.get('ppsr_end_date'),
            'effDaysClosePpsr': ret.get('eff_days_close_ppsr'),
            'prodQtyBefore': ret.get('prod_qty_before'),
            'rejectedQtyBefore': ret.get('rejected_qty_before'),
            'pctBefore': ret.get('pct_before'),
            'prodQtyAfter': ret.get('prod_qty_after'),
            'rejectedQtyAfter': ret.get('rejected_qty_after'),
            'pctAfter': ret.get('pct_after'),
            'effectivityText': ret.get('effectivity_text'),
            'costSavePerMonth': ret.get('cost_save_per_month'),
            'costSavePerAnnum': ret.get('cost_save_per_annum'),
            'committeeDecision': ret.get('committee_decision'),
            'committeeDecisionDate': ret.get('committee_decision_date'),
            'steeringCommitteeSign': ret.get('steering_committee_sign'),
            'custDemandQtyMonth': ret.get('cust_demand_qty_month'),
            'custDemandQtyAnnum': ret.get('cust_demand_qty_annum'),
            'qtyMonthBeforeRejPct': ret.get('qty_month_before_rej_pct'),
            'qtyMonthAfterRejPct': ret.get('qty_month_after_rej_pct'),
            'qtyMonthSavedRejPct': ret.get('qty_month_saved_rej_pct'),
            'perSetRejectionCost': ret.get('per_set_rejection_cost'),
            'createdAt': ret.get('created_at'),
            'updatedAt': ret.get('updated_at'),
        }

        # Calculate root cause analysis summary for inspection and presentation
        rc_summary = ""
        if hasattr(instance, 'five_whys') and instance.five_whys:
            whys = []
            for col in [instance.five_whys.column1, instance.five_whys.column2, instance.five_whys.column3]:
                if isinstance(col, list) and col:
                    whys.extend([str(item) for item in col if item])
            if whys:
                rc_summary = " -> ".join(whys)

        if not rc_summary and instance.standard_worksheet and isinstance(instance.standard_worksheet, list):
            causes = [
                row.get('root_cause', '') or row.get('cause', '')
                for row in instance.standard_worksheet
                if isinstance(row, dict)
            ]
            causes = [c for c in causes if c]
            if causes:
                rc_summary = ", ".join(causes)

        if not rc_summary:
            rc_summary = instance.problem_statement or ""

        ret['root_cause_analysis'] = rc_summary[:200]
        aliases['rootCauseAnalysis'] = rc_summary[:200]
        aliases['root_cause_analysis'] = rc_summary[:200]

        # Map presentation feedback if exists
        feedback_list = []
        if hasattr(instance, 'committee_feedback'):
            for fb in instance.committee_feedback.all():
                feedback_list.append({
                    'id': str(fb.id),
                    'stepNumber': fb.step_number,
                    'stepTitle': fb.step_title,
                    'reviewerName': fb.reviewer_name,
                    'feedbackType': fb.feedback_type,
                    'comment': fb.comment,
                    'resolved': fb.resolved,
                    'createdAt': fb.created_at.strftime('%Y-%m-%d %H:%M') if fb.created_at else ''
                })
        ret['presentation_feedback'] = feedback_list
        aliases['presentationFeedback'] = feedback_list
        aliases['presentation_feedback'] = feedback_list

        for k, v in aliases.items():
            if k not in ret and v is not None:
                ret[k] = v

        # Dual-key ishikawa and fishbone with 6M category variants
        ish = ret.get('ishikawa') or ret.get('fishbone')
        if isinstance(ish, dict):
            dual_ish = dict(ish)
            if 'methods' in dual_ish and 'method' not in dual_ish:
                dual_ish['method'] = dual_ish['methods']
            elif 'method' in dual_ish and 'methods' not in dual_ish:
                dual_ish['methods'] = dual_ish['method']
            if 'milieu' in dual_ish and 'environment' not in dual_ish:
                dual_ish['environment'] = dual_ish['milieu']
            elif 'environment' in dual_ish and 'milieu' not in dual_ish:
                dual_ish['milieu'] = dual_ish['environment']
            if 'measurement' in dual_ish and 'measurements' not in dual_ish:
                dual_ish['measurements'] = dual_ish['measurement']
            elif 'measurements' in dual_ish and 'measurement' not in dual_ish:
                dual_ish['measurement'] = dual_ish['measurements']
            ret['ishikawa'] = dual_ish
            ret['fishbone'] = dual_ish

        # Dual-key psq_tree_data and psqTreeData with camelCase and snake_case swap data
        psq = ret.get('psq_tree_data') or ret.get('psqTreeData')
        if isinstance(psq, dict):
            dual_psq = dict(psq)
            swap = dual_psq.get('swapData') or dual_psq.get('swap_data')
            if isinstance(swap, dict):
                dual_swap = dict(swap)
                for s_key in ['stage0', 'stage1', 'stage2']:
                    snake_s = f'stage_{s_key[-1]}'
                    s_val = dual_swap.get(s_key) or dual_swap.get(snake_s)
                    if isinstance(s_val, dict):
                        dual_s = dict(s_val)
                        if 'bobOriginal' in dual_s and 'bob_original' not in dual_s:
                            dual_s['bob_original'] = dual_s['bobOriginal']
                        elif 'bob_original' in dual_s and 'bobOriginal' not in dual_s:
                            dual_s['bobOriginal'] = dual_s['bob_original']
                        if 'wowOriginal' in dual_s and 'wow_original' not in dual_s:
                            dual_s['wow_original'] = dual_s['wowOriginal']
                        elif 'wow_original' in dual_s and 'wowOriginal' not in dual_s:
                            dual_s['wowOriginal'] = dual_s['wow_original']
                        dual_swap[s_key] = dual_s
                        dual_swap[snake_s] = dual_s
                dual_psq['swapData'] = dual_swap
                dual_psq['swap_data'] = dual_swap
            ret['psq_tree_data'] = dual_psq
            ret['psqTreeData'] = dual_psq

        if 'facts_analysis' in ret and isinstance(ret['facts_analysis'], dict):
            fa = dict(ret['facts_analysis'])
            pairs = [
                ('whatIs', 'what_is'),
                ('whatIsNot', 'what_is_not'),
                ('whereIs', 'where_is'),
                ('whereIsNot', 'where_is_not'),
                ('howIs', 'how_is'),
                ('howIsNot', 'how_is_not'),
                ('whenIs', 'when_is'),
                ('whenIsNot', 'when_is_not'),
            ]
            for camel, snake in pairs:
                val = fa.get(camel) if fa.get(camel) is not None else fa.get(snake)
                if val is not None:
                    fa[camel] = val
                    fa[snake] = val
            ret['facts_analysis'] = fa
            ret['factsAnalysis'] = fa

        if 'completion_signatures' in ret and isinstance(ret['completion_signatures'], dict):
            cs = dict(ret['completion_signatures'])
            pairs = [
                ('projectLeader', 'project_leader'),
                ('steeringCommittee', 'steering_committee'),
                ('completedOn', 'completed_on'),
            ]
            for camel, snake in pairs:
                val = cs.get(camel) if cs.get(camel) is not None else cs.get(snake)
                if val is not None:
                    cs[camel] = val
                    cs[snake] = val
            ret['completion_signatures'] = cs
            ret['completionSignatures'] = cs

        for trend_field in ['initial_defect_trend_data', 'defect_trend_data', 'effectiveness_chart_data']:
            if trend_field in ret and isinstance(ret[trend_field], list):
                dual_items = []
                for it in ret[trend_field]:
                    if isinstance(it, dict):
                        d_item = dict(it)
                        val = d_item.get('defectsCount') if d_item.get('defectsCount') is not None else (d_item.get('defects_count') if d_item.get('defects_count') is not None else d_item.get('value'))
                        if val is not None:
                            d_item['defectsCount'] = val
                            d_item['defects_count'] = val
                            d_item['value'] = val
                        dt = d_item.get('date') or d_item.get('name')
                        if dt:
                            d_item['date'] = dt
                            d_item['name'] = dt
                        dual_items.append(d_item)
                    else:
                        dual_items.append(it)
                ret[trend_field] = dual_items
                if trend_field == 'initial_defect_trend_data':
                    ret['initialDefectTrendData'] = dual_items
                elif trend_field == 'defect_trend_data':
                    ret['defectTrendData'] = dual_items
                elif trend_field == 'effectiveness_chart_data':
                    ret['effectivenessChartData'] = dual_items

        return ret

    def create(self, validated_data):
        containment_data = validated_data.pop('containment_actions', [])
        corrective_data = validated_data.pop('corrective_actions', [])
        standardization_data = validated_data.pop('standardization_items', [])
        read_across_data = validated_data.pop('read_across_items', [])
        five_whys_data = validated_data.pop('five_whys', None)

        if 'ppsr_no' not in validated_data or not validated_data['ppsr_no']:
            validated_data['ppsr_no'] = generate_ppsr_number()

        report = PpsrReport.objects.create(**validated_data)

        for item in containment_data:
            item.pop('report', None)
            ContainmentAction.objects.create(report=report, **item)

        for item in corrective_data:
            item.pop('report', None)
            CorrectiveAction.objects.create(report=report, **item)

        for item in standardization_data:
            item.pop('report', None)
            StandardizationItem.objects.create(report=report, **item)

        for item in read_across_data:
            item.pop('report', None)
            ReadAcrossItem.objects.create(report=report, **item)

        if five_whys_data is not None:
            five_whys_data.pop('report', None)
            FiveWhysChain.objects.create(report=report, **five_whys_data)

        return report

    def update(self, instance, validated_data):
        containment_data = validated_data.pop('containment_actions', None)
        corrective_data = validated_data.pop('corrective_actions', None)
        standardization_data = validated_data.pop('standardization_items', None)
        read_across_data = validated_data.pop('read_across_items', None)
        five_whys_data = validated_data.pop('five_whys', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if containment_data is not None:
            instance.containment_actions.all().delete()
            for item in containment_data:
                item.pop('report', None)
                ContainmentAction.objects.create(report=instance, **item)

        if corrective_data is not None:
            instance.corrective_actions.all().delete()
            for item in corrective_data:
                item.pop('report', None)
                CorrectiveAction.objects.create(report=instance, **item)

        if standardization_data is not None:
            instance.standardization_items.all().delete()
            for item in standardization_data:
                item.pop('report', None)
                StandardizationItem.objects.create(report=instance, **item)

        if read_across_data is not None:
            instance.read_across_items.all().delete()
            for item in read_across_data:
                item.pop('report', None)
                ReadAcrossItem.objects.create(report=instance, **item)

        if five_whys_data is not None:
            five_whys_data.pop('report', None)
            FiveWhysChain.objects.update_or_create(report=instance, defaults=five_whys_data)

        # Handle presentation feedback updates
        fb_data = self.initial_data.get('presentationFeedback') or self.initial_data.get('presentation_feedback')
        if fb_data and isinstance(fb_data, list):
            for item in fb_data:
                if isinstance(item, dict) and item.get('comment'):
                    fb_obj = instance.committee_feedback.filter(
                        step_number=item.get('stepNumber') or item.get('step_number', 1),
                        comment=item.get('comment')
                    ).first()
                    if fb_obj:
                        fb_obj.resolved = item.get('resolved', False)
                        fb_obj.save(update_fields=['resolved'])
                    else:
                        CommitteeFeedback.objects.create(
                            report=instance,
                            step_number=item.get('stepNumber') or item.get('step_number', 1),
                            step_title=item.get('stepTitle') or item.get('step_title', ''),
                            reviewer_name=item.get('reviewerName') or item.get('reviewer_name', 'Committee Member'),
                            feedback_type=item.get('feedbackType') or item.get('feedback_type', 'general'),
                            comment=item.get('comment'),
                            resolved=item.get('resolved', False),
                        )

        return instance


# ============================================================================
# Task 3.4 — Metrics Calculator Serializer
# ============================================================================

class PpsrMetricsSerializer(serializers.ModelSerializer):
    """
    Serializer for the spreadsheet metrics update endpoint.
    Accepts raw production inputs and triggers MetricsCalculatorService in validate()
    to compute derived percentages, volumes, and cost savings before saving.
    """
    class Meta:
        model = PpsrReport
        fields = [
            'prod_qty_before',
            'rejected_qty_before',
            'prod_qty_after',
            'rejected_qty_after',
            'cust_demand_qty_month',
            'per_set_rejection_cost',
            'jira_number',
            'week',
            'coach',
            'cft',
            'std_status_mf',
            'std_date',
            'responsibility',
            'ppsr_end_date',
            'effectivity_text',
            'remarks',
            # Computed read-only outputs
            'pct_before',
            'pct_after',
            'cust_demand_qty_annum',
            'qty_month_before_rej_pct',
            'qty_month_after_rej_pct',
            'qty_month_saved_rej_pct',
            'cost_save_per_month',
            'cost_save_per_annum',
            'eff_days_std',
            'eff_days_close_ppsr',
        ]
        read_only_fields = [
            'pct_before',
            'pct_after',
            'cust_demand_qty_annum',
            'qty_month_before_rej_pct',
            'qty_month_after_rej_pct',
            'qty_month_saved_rej_pct',
            'cost_save_per_month',
            'cost_save_per_annum',
            'eff_days_std',
            'eff_days_close_ppsr',
        ]

    def validate(self, attrs):
        prod_qty_before = attrs.get('prod_qty_before', getattr(self.instance, 'prod_qty_before', None))
        rejected_qty_before = attrs.get('rejected_qty_before', getattr(self.instance, 'rejected_qty_before', None))
        prod_qty_after = attrs.get('prod_qty_after', getattr(self.instance, 'prod_qty_after', None))
        rejected_qty_after = attrs.get('rejected_qty_after', getattr(self.instance, 'rejected_qty_after', None))
        cust_demand_qty_month = attrs.get('cust_demand_qty_month', getattr(self.instance, 'cust_demand_qty_month', None))
        per_set_rejection_cost = attrs.get('per_set_rejection_cost', getattr(self.instance, 'per_set_rejection_cost', None))
        std_date = attrs.get('std_date', getattr(self.instance, 'std_date', None))
        ppsr_end_date = attrs.get('ppsr_end_date', getattr(self.instance, 'ppsr_end_date', None))
        created_at = getattr(self.instance, 'created_at', None)

        computed = calculate_spreadsheet_metrics(
            prod_qty_before=prod_qty_before,
            rejected_qty_before=rejected_qty_before,
            prod_qty_after=prod_qty_after,
            rejected_qty_after=rejected_qty_after,
            cust_demand_qty_month=cust_demand_qty_month,
            per_set_rejection_cost=per_set_rejection_cost,
            created_at=created_at,
            std_date=std_date,
            ppsr_end_date=ppsr_end_date,
        )
        attrs.update(computed)
        return attrs


# ============================================================================
# Task 3.5 — Meeting Log Serializer
# ============================================================================

class PpsrMeetingLogSerializer(serializers.ModelSerializer):
    """
    Serializer for Steering Committee review meeting logs.
    Exposes discussed_ppsr_ids as PrimaryKeyRelatedField array of report UUIDs,
    and discussed_ppsrs with nested summary (ppsr_no + title) for list/detail views.
    """
    discussed_ppsr_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=PpsrReport.objects.all(),
        required=False
    )
    discussed_ppsrs = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PpsrMeetingLog
        fields = [
            'id',
            'meeting_date',
            'chairperson',
            'attendees',
            'key_discussion_points',
            'discussed_ppsr_ids',
            'discussed_ppsrs',
            'next_review_date',
            'created_at',
        ]
        read_only_fields = ['id', 'discussed_ppsrs', 'created_at']

    def get_discussed_ppsrs(self, obj: PpsrMeetingLog) -> list:
        return [
            {
                'id': str(report.id),
                'ppsr_no': report.ppsr_no,
                'title': report.title,
                'lead_owner': report.lead_owner or '',
                'plant': report.plant or '',
                'status': report.status or '',
            }
            for report in obj.discussed_ppsr_ids.all()
        ]


# ============================================================================
# Task 3.6 — Committee Feedback Serializer
# ============================================================================

class CommitteeFeedbackSerializer(serializers.ModelSerializer):
    """
    Serializer for per-step presentation feedback.
    Validates step_number to be between 1 and 8 (8D steps).
    """
    class Meta:
        model = CommitteeFeedback
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True}
        }

    def validate_step_number(self, value: int) -> int:
        if value < 1 or value > 8:
            raise serializers.ValidationError("step_number must be between 1 and 8 inclusive.")
        return value


# ============================================================================
# Task 3.7 — CFT Member & Rating Serializers
# ============================================================================

class CftMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CftMember
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CftRatingSerializer(serializers.ModelSerializer):
    """
    Serializer for CFT member star ratings.
    Supports member_id and report_id for creation/update while exposing
    member_name and report_ppsr_no for read views.
    """
    member_id = serializers.PrimaryKeyRelatedField(
        queryset=CftMember.objects.all(),
        source='member',
        write_only=True
    )
    report_id = serializers.PrimaryKeyRelatedField(
        queryset=PpsrReport.objects.all(),
        source='report',
        write_only=True
    )
    member_name = serializers.CharField(source='member.name', read_only=True)
    report_ppsr_no = serializers.CharField(source='report.ppsr_no', read_only=True)

    class Meta:
        model = CftRating
        fields = [
            'id',
            'member',
            'report',
            'member_id',
            'report_id',
            'member_name',
            'report_ppsr_no',
            'score',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'member', 'report', 'created_at', 'updated_at']


# ============================================================================
# Task 3.8 — Award Leaderboard Serializer
# ============================================================================

class AwardLeaderboardSerializer(serializers.Serializer):
    """
    Read-only output serializer for CFT monthly award leaderboard rankings.
    """
    report_id = serializers.CharField()
    ppsr_no = serializers.CharField()
    title = serializers.CharField()
    lead_owner = serializers.CharField(required=False, allow_blank=True, default='')
    plant = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.CharField(required=False, allow_blank=True, default='')
    total_score = serializers.IntegerField()
    votes_count = serializers.IntegerField()
    category = serializers.CharField()
