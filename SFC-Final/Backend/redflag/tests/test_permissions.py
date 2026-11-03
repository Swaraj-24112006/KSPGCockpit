from django.test import TestCase
from django.contrib.auth.models import User, Group
from redflag.models import Department, Plant, Employee
from redflag.permissions import (
    user_roles,
    IsQualityCustodian,
    IsPlantHead,
    IsTargetPersonFor,
    GROUP_QUALITY_CUSTODIAN,
    GROUP_PLANT_HEAD,
    GROUP_TARGET_PERSON,
    ROLE_INITIATOR,
    ROLE_PLANT_HEAD,
    ROLE_QUALITY_CUSTODIAN,
    ROLE_TARGET_PERSON,
)

class MockRequest:
    def __init__(self, user):
        self.user = user

class MockFlagObject:
    def __init__(self, target_person=None, target_department=None):
        self.target_person = target_person
        self.target_department = target_department

class PermissionUnitTests(TestCase):
    def setUp(self):
        # Create standard groups
        self.grp_qa, _ = Group.objects.get_or_create(name=GROUP_QUALITY_CUSTODIAN)
        self.grp_ph, _ = Group.objects.get_or_create(name=GROUP_PLANT_HEAD)
        self.grp_target, _ = Group.objects.get_or_create(name=GROUP_TARGET_PERSON)

        # Create master objects
        self.dept_prod = Department.objects.create(code="PROD", name="Production")
        self.dept_maint = Department.objects.create(code="MAINT", name="Maintenance")
        self.plant = Plant.objects.create(code="MF1", name="Plant 1")

        # Standard users
        self.regular_user = User.objects.create_user(username="regular", password="pwd")
        self.emp_regular = Employee.objects.create(
            user=self.regular_user,
            employee_code="EMP_REG",
            full_name="Regular Operator",
            designation="Operator",
            department=self.dept_prod,
            plant=self.plant
        )

        self.qa_user = User.objects.create_user(username="qa_lead", password="pwd")
        self.qa_user.groups.add(self.grp_qa)
        self.emp_qa = Employee.objects.create(
            user=self.qa_user,
            employee_code="EMP_QA",
            full_name="Sunil Deshmukh",
            designation="Quality Lead",
            department=self.dept_prod,
            plant=self.plant
        )

        self.ph_user = User.objects.create_user(username="plant_head", password="pwd")
        self.ph_user.groups.add(self.grp_ph)

        self.target_user = User.objects.create_user(username="target_person", password="pwd")
        self.target_user.groups.add(self.grp_target)
        self.emp_target = Employee.objects.create(
            user=self.target_user,
            employee_code="EMP_TGT",
            full_name="Vikram Singh",
            designation="Maintenance Lead",
            department=self.dept_maint,
            plant=self.plant
        )

    def test_user_roles(self):
        # Regular user only has Initiator
        roles_reg = user_roles(self.regular_user)
        self.assertIn(ROLE_INITIATOR, roles_reg)
        self.assertNotIn(ROLE_PLANT_HEAD, roles_reg)
        self.assertNotIn(ROLE_QUALITY_CUSTODIAN, roles_reg)

        # QA user
        roles_qa = user_roles(self.qa_user)
        self.assertIn(ROLE_INITIATOR, roles_qa)
        self.assertIn(ROLE_QUALITY_CUSTODIAN, roles_qa)

        # Plant Head
        roles_ph = user_roles(self.ph_user)
        self.assertIn(ROLE_INITIATOR, roles_ph)
        self.assertIn(ROLE_PLANT_HEAD, roles_ph)

        # Target Person
        roles_tgt = user_roles(self.target_user)
        self.assertIn(ROLE_TARGET_PERSON, roles_tgt)

    def test_is_quality_custodian_permission(self):
        perm = IsQualityCustodian()
        self.assertTrue(perm.has_permission(MockRequest(self.qa_user), None))
        self.assertTrue(perm.has_permission(MockRequest(self.ph_user), None))  # Plant head has custody access
        self.assertFalse(perm.has_permission(MockRequest(self.regular_user), None))

    def test_is_plant_head_permission(self):
        perm = IsPlantHead()
        self.assertTrue(perm.has_permission(MockRequest(self.ph_user), None))
        self.assertFalse(perm.has_permission(MockRequest(self.qa_user), None))
        self.assertFalse(perm.has_permission(MockRequest(self.regular_user), None))

    def test_is_target_person_for_object_permission(self):
        perm = IsTargetPersonFor()
        flag_for_target = MockFlagObject(target_person=self.emp_target, target_department=self.dept_maint)
        flag_for_other = MockFlagObject(target_person=self.emp_regular, target_department=self.dept_prod)

        # Assigned target person directly
        self.assertTrue(perm.has_object_permission(MockRequest(self.target_user), None, flag_for_target))
        self.assertFalse(perm.has_object_permission(MockRequest(self.target_user), None, flag_for_other))

        # Plant Head passes all
        self.assertTrue(perm.has_object_permission(MockRequest(self.ph_user), None, flag_for_target))

        # Regular user fails
        self.assertFalse(perm.has_object_permission(MockRequest(self.regular_user), None, flag_for_target))

