Boss of the SOC Dataset Version 1 - An educational resource for
information security professionals, students, and enthusiasts

Written in 2016 by Ryan Kovar, David Herrald, and James Brodsky

To the extent possible under law, the author(s) have dedicated
all copyright and related and neighboring rights to this software
to the public domain worldwide. This software is distributed
without any warranty. You should have received a copy of the CC0
Public Domain Dedication along with this software. If not, see
http://creativecommons.org/publicdomain/zero/1.0/.


The dataset requires the following software which is distributed separately
and should be installed before using this dataset. The versions listed are
those that were used to create the dataset. Different versions of the software
may or may not work properly with this dataset.

Splunk Enterprise
  Version 6.5.2
  http://www.splunk.com

Fortinet Fortigate Add-on for Splunk
  Version 1.3
  https://splunkbase.splunk.com/app/2846

Splunk Add-on for Tenable
  Version 5.0.0
  https://splunkbase.splunk.com/app/1710/
  Note v5.0.0 is no longer publicly available. Use v5.1.1 instead.

Splunk Stream Add-on
  Version 6.6.1
  https://splunkbase.splunk.com/app/1809/
  Note Stream 6.6.1 is no longer available. Use Version 7.1.1 instead.

Splunk App for Stream
  Version 6.6.1
  https://splunkbase.splunk.com/app/1809/
  Note Stream 6.6.1 is no longer available. Use Version 7.1.1 instead.

Splunk Add-on for Microsoft Windows
  Version 4.8.3
  https://splunkbase.splunk.com/app/742/

TA-Suricata
  Version 2.3
  https://splunkbase.splunk.com/app/2760/

Microsoft Sysmon Add-on
  Version 3.2.3
  https://splunkbase.splunk.com/app/1914/

URL Toolbox
  Version 1.6
  https://splunkbase.splunk.com/app/2734/

After installing this app and the add-ons listed above you can begin 
searching the data with the following SPL:

	index=botsv1 earliest=0

