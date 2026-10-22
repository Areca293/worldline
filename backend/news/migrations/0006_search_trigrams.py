from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("news", "0005_repository_starobservation")]
    operations = [TrigramExtension()]
